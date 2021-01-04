# 计算属性：计算属性比普通函数好在哪里？
计算属性是 Vue.js 开发中一个非常实用的 API ，它允许用户定义一个计算方法，然后根据一些依赖的响应式数据计算出新值并返回。当依赖发生变化时，计算属性可以自动重新计算获取新值，所以使用起来非常方便。

computed API 的实现：
```js
function computed(getterOrOptions) { 
  // getter 函数 
  let getter 
  // setter 函数 
  let setter 
  // 标准化参数 
  if (isFunction(getterOrOptions)) { 
    // 表面传入的是 getter 函数，不能修改计算属性的值 
    getter = getterOrOptions 
    setter = (process.env.NODE_ENV !== 'production') 
      ? () => { 
        console.warn('Write operation failed: computed value is readonly') 
      } 
      : NOOP 
  } 
  else { 
    getter = getterOrOptions.get 
    setter = getterOrOptions.set 
  } 
  // 数据是否脏的 
  let dirty = true 
  // 计算结果 
  let value 
  let computed 
  // 创建副作用函数 
  const runner = effect(getter, { 
    // 延时执行 
    lazy: true, 
    // 标记这是一个 computed effect 用于在 trigger 阶段的优先级排序 
    computed: true, 
    // 调度执行的实现 
    scheduler: () => { 
      if (!dirty) { 
        dirty = true 
        // 派发通知，通知运行访问该计算属性的 activeEffect 
        trigger(computed, "set" /* SET */, 'value') 
      } 
    } 
  }) 
  // 创建 computed 对象 
  computed = { 
    __v_isRef: true, 
    // 暴露 effect 对象以便计算属性可以停止计算 
    effect: runner, 
    get value() { 
      // 计算属性的 getter 
      if (dirty) { 
        // 只有数据为脏的时候才会重新计算 
        value = runner() 
        dirty = false 
      } 
      // 依赖收集，收集运行访问该计算属性的 activeEffect 
      track(computed, "get" /* GET */, 'value') 
      return value 
    }, 
    set value(newValue) { 
      // 计算属性的 setter 
      setter(newValue) 
    } 
  } 
  return computed 
}
```
从代码中可以看到，computed 函数的流程主要做了三件事情：标准化参数，创建副作用函数和创建 computed 对象。

首先是**标准化参数**。computed 函数接受两种类型的参数，一个是 getter 函数，一个是拥有 getter 和 setter 函数的对象，通过判断参数的类型，我们初始化了函数内部定义的 getter 和 setter 函数。

接着是**创建副作用函数 runner**。computed 内部通过 effect 创建了一个副作用函数，它是对 getter 函数做的一层封装，另外我们这里要注意第二个参数，也就是 effect 函数的配置对象。其中 lazy 为 true 表示 effect 函数返回的 runner 并不会立即执行；computed 为 true 用于表示这是一个 computed effect，用于 trigger 阶段的优先级排序，我们稍后会分析；scheduler 表示它的调度运行的方式，我们也稍后分析。

最后是**创建 computed 对象**并返回，这个对象也拥有 getter 和 setter 函数。当 computed 对象被访问的时候会触发 getter，然后会判断是否 dirty，如果是就执行 runner，然后做依赖收集；当我们直接设置 computed 对象时会触发 setter，即执行 computed 函数内部定义的 setter 函数。

### 计算属性的运行机制
computed 内部两个重要的变量，第一个 dirty 表示一个计算属性的值是否是“脏的”，用来判断需不需要重新计算，第二个 value 表示计算属性每次计算后的结果。

![](https://upload-images.jianshu.io/upload_images/3061147-5e363e824c294421.png?imageMogr2/auto-orient/strip%7CimageView2/2/w/1240)

可以看出 computed 计算属性有两个特点：
- 延时计算，只有当我们访问计算属性的时候，它才会真正运行 computed getter 函数计算；
- 缓存，它的内部会缓存上次的计算结果 value，而且只有 dirty 为 true 时才会重新计算。如果访问计算属性时 dirty 为 false，那么直接返回这个 value。

和单纯使用普通函数相比，计算属性的优势是：**只要依赖不变化，就可以使用缓存的 value 而不用每次在渲染组件的时候都执行函数去计算**，这是典型的空间换时间的优化思想。

### 计算属性的执行顺序
我们曾提到计算属性内部创建副作用函数的时候会配置 computed 为 true，标识这是一个 computed effect，用于在 trigger 阶段的优先级排序。我们来回顾一下 trigger 函数执行 effects 的过程：
```js
const add = (effectsToAdd) => { 
  if (effectsToAdd) { 
    effectsToAdd.forEach(effect => { 
      if (effect !== activeEffect || !shouldTrack) { 
        if (effect.options.computed) { 
          computedRunners.add(effect) 
        } 
        else { 
          effects.add(effect) 
        } 
      } 
    }) 
  } 
} 
const run = (effect) => { 
  if (effect.options.scheduler) { 
    effect.options.scheduler(effect) 
  } 
  else { 
    effect() 
  } 
} 
computedRunners.forEach(run) 
effects.forEach(run)
```
在上一节课分析 trigger 函数的时候，为了方便你理解主干逻辑，我省略了 computedRunners 的分支逻辑。实际上，在添加待运行的 effects 的时候，我们会判断每一个 effect 是不是一个 computed effect，如果是的话会添加到 computedRunners 中，在后面运行的时候会优先执行 computedRunners，然后再执行普通的 effects。

那么为什么要这么设计呢？其实是考虑到了一些特殊场景，我们通过一个示例来说明：
```js
import { ref, computed } from 'vue' 
import { effect } from '@vue/reactivity' 
const count = ref(0) 
const plusOne = computed(() => { 
  return count.value + 1 
}) 
effect(() => { 
  console.log(plusOne.value + count.value) 
}) 
function plus() { 
  count.value++ 
} 
plus()
// 运行结果
1 
3
3
```
在执行 effect 函数时运行 console.log(plusOne.value + count.value)，所以第一次输出 1，此时 count.value 是 0，plusOne.value 是 1。

后面连续输出两次 3 是因为， plusOne 和 count 的依赖都是这个 effect 函数，所以当我们执行 plus 函数修改 count 的值时，会触发并执行这个 effect 函数，因为 plusOne 的 runner 也是 count 的依赖，count 值修改也会执行 plusOne 的 runner，也就会再次执行 plusOne 的依赖即 effect 函数，因此会输出两次。

那么为什么两次都输出 3 呢？这就跟先执行 computed runner 有关。首先，由于 plusOne 的 runner 和 effect 都是 count 的依赖，当我们修改 count 值的时候， plusOne 的 runner 和 effect 都会执行，那么此时执行顺序就很重要了。

这里先执行 plusOne 的 runner，把 plusOne 的 dirty 设置为 true，然后通知它的依赖 effect 执行 plusOne.value + count.value。这个时候，由于 dirty 为 true，就会再次执行 plusOne 的 getter 计算新值，拿到了新值 2， 再加上 1 就得到 3。执行完 plusOne 的 runner 以及依赖更新之后，再去执行 count 的普通effect 依赖，从而去执行 plusOne.value + count.value，这个时候 plusOne dirty 为 false， 直接返回上次的计算结果 2，然后再加 1 就又得到 3。

## 总结
算属性的两个特点——延时计算和缓存，希望在组件的开发中合理使用计算属性。

:::tip
vue-next 最新版本移除了 computedRunners。具体原因可以看这个 issue：https://github.com/vuejs/vue-next/pull/1458
:::
