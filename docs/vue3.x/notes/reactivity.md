# 响应式：响应式内部的实现原理是怎样的？
除了组件化，Vue.js 另一个核心设计思想就是响应式。它的本质是当数据变化后会自动执行某个函数，映射到组件的实现就是，当数据变化后，会自动触发组件的重新渲染。
> 响应式是 Vue.js 组件化更新渲染的一个核心机制。

Vue2.0定义响应式数据是通过data返回一个对象，而Vue3.0是通过reactive定义响应式对象数据。

先来看一下 reactive 函数的具体实现过程：
```js
function reactive (target) {
   // 如果尝试把一个 readonly proxy 变成响应式，直接返回这个 readonly proxy
  if (target && target.__v_isReadonly) {
     return target
  } 
  return createReactiveObject(target, false, mutableHandlers, mutableCollectionHandlers)
}
function createReactiveObject(target, isReadonly, baseHandlers, collectionHandlers) {
  if (!isObject(target)) {
    // 目标必须是对象或数组类型
    if ((process.env.NODE_ENV !== 'production')) {
      console.warn(`value cannot be made reactive: ${String(target)}`)
    }
    return target
  }
  if (target.__v_raw && !(isReadonly && target.__v_isReactive)) {
    // target 已经是 Proxy 对象，直接返回
    // 有个例外，如果是 readonly 作用于一个响应式对象，则继续
    return target
  }
  if (hasOwn(target, isReadonly ? "__v_readonly" /* readonly */ : "__v_reactive" /* reactive */)) {
    // target 已经有对应的 Proxy 了
    return isReadonly ? target.__v_readonly : target.__v_reactive
  }
  // 只有在白名单里的数据类型才能变成响应式
  if (!canObserve(target)) {
    return target
  }
  // 利用 Proxy 创建响应式
  const observed = new Proxy(target, collectionTypes.has(target.constructor) ? collectionHandlers : baseHandlers)
  // 给原始数据打个标识，说明它已经变成响应式，并且有对应的 Proxy 了
  def(target, isReadonly ? "__v_readonly" /* readonly */ : "__v_reactive" /* reactive */, observed)
  return observed
}
```
在这个过程中，createReactiveObject 函数主要做了以下几件事情。

1.函数首先判断 target 是不是数组或者对象类型，如果不是则直接返回。所以原始数据 target 必须是对象或者数组。
2.如果对一个已经是响应式的对象再次执行 reactive，还应该返回这个响应式对象，因为这里 reactive 函数会通过 target.__v_raw 属性来判断 target 是否已经是一个响应式对象（因为响应式对象的 __v_raw 属性会指向它自身），如果是的话则直接返回响应式对象。
3.如果对同一个原始数据多次执行 reactive ，那么会返回相同的响应式对象，因为reactive 函数会通过 target.__v_reactive 判断 target 是否已经有对应的响应式对象（因为创建完响应式对象后，会给原始对象打上 __v_reactive 标识），如果有则返回这个响应式对象。
4.使用 canObserve 函数对 target 对象做一进步限制：
```js
const canObserve = (value) => {
  return (!value.__v_skip &&
   isObservableType(toRawType(value)) &&
   !Object.isFrozen(value))
}
const isObservableType = /*#__PURE__*/ makeMap('Object,Array,Map,Set,WeakMap,WeakSet')
```
比如，带有 __v_skip 属性的对象、被冻结的对象，以及不在白名单内的对象如 Date 类型的对象实例是不能变成响应式的。
5.通过 Proxy API 劫持 target 对象，把它变成响应式。我们把 Proxy 函数返回的结果称作响应式对象，这里 Proxy 对应的处理器对象会根据数据类型的不同而不同，我们稍后会重点分析基本数据类型的 Proxy 处理器对象，reactive 函数传入的 baseHandlers 值是 mutableHandlers。
6.给原始数据打个标识`target.__v_reactive = observed`

Proxy 处理器对象 mutableHandlers 的实现：
```js
const mutableHandlers = {
  get, // 访问对象属性会触发 get 函数；
  set, // 设置对象属性会触发 set 函数；
  deleteProperty, // 删除对象属性会触发 deleteProperty 函数；
  has, // in 操作符会触发 has 函数；
  ownKeys // 通过 Object.getOwnPropertyNames 访问对象属性名会触发 ownKeys 函数。
}
```

### 依赖收集：get 函数
依赖收集发生在数据访问的阶段，由于我们用 Proxy API 劫持了数据对象，所以当这个响应式对象属性被访问的时候就会执行 get 函数，我们来看一下 get 函数的实现，其实它是执行 createGetter 函数的返回值，为了分析主要流程，这里省略了 get 函数中的一些分支逻辑，isReadonly 也默认为 false：
```js
function createGetter(isReadonly = false) {
  return function get(target, key, receiver) {
    if (key === "__v_isReactive" /* isReactive */) {
      // 代理 observed.__v_isReactive
      return !isReadonly
    }
    else if (key === "__v_isReadonly" /* isReadonly */) {
      // 代理 observed.__v_isReadonly
      return isReadonly;
    }
    else if (key === "__v_raw" /* raw */) {
      // 代理 observed.__v_raw
      return target
    }
    const targetIsArray = isArray(target)
    // arrayInstrumentations 包含对数组一些方法修改的函数
    if (targetIsArray && hasOwn(arrayInstrumentations, key)) {
      return Reflect.get(arrayInstrumentations, key, receiver)
    }
    // 求值
    const res = Reflect.get(target, key, receiver)
    // 内置 Symbol key 不需要依赖收集
    if (isSymbol(key) && builtInSymbols.has(key) || key === '__proto__') {
      return res
    }
    // 依赖收集
    !isReadonly && track(target, "get" /* GET */, key)
    return isObject(res)
      ? isReadonly
        ?
        readonly(res)
        // 如果 res 是个对象或者数组类型，则递归执行 reactive 函数把 res 变成响应式
        : reactive(res)
      : res
  }
}
```
整个 get 函数最核心的部分其实是执行 track 函数收集依赖，下面我们重点分析这个过程。
```js
// 是否应该收集依赖
let shouldTrack = true
// 当前激活的 effect
let activeEffect
// 原始数据对象 map
const targetMap = new WeakMap()
function track(target, type, key) {
  if (!shouldTrack || activeEffect === undefined) {
    return
  }
  let depsMap = targetMap.get(target)
  if (!depsMap) {
    // 每个 target 对应一个 depsMap
    targetMap.set(target, (depsMap = new Map()))
  }
  let dep = depsMap.get(key)
  if (!dep) {
    // 每个 key 对应一个 dep 集合
    depsMap.set(key, (dep = new Set()))
  }
  if (!dep.has(activeEffect)) {
    // 收集当前激活的 effect 作为依赖
    dep.add(activeEffect)
   // 当前激活的 effect 收集 dep 集合作为依赖
    activeEffect.deps.push(dep)
  }
}
```
分析这个函数的实现前，我们先想一下要收集的依赖是什么，我们的目的是实现响应式，就是当数据变化的时候可以自动做一些事情，比如执行某些函数，所以我们收集的依赖就是数据变化后执行的副作用函数。

再来看实现，我们把 target 作为原始的数据，key 作为访问的属性。我们创建了全局的 targetMap 作为原始数据对象的 Map，它的键是 target，值是 depsMap，作为依赖的 Map；这个 depsMap 的键是 target 的 key，值是 dep 集合，dep 集合中存储的是依赖的副作用函数。为了方便理解，可以通过下图表示它们之间的关系：
![](https://upload-images.jianshu.io/upload_images/3061147-3f2e2dc884908064.png?imageMogr2/auto-orient/strip%7CimageView2/2/w/1240)

所以每次 track ，就是把当前激活的副作用函数 activeEffect 作为依赖，然后收集到 target 相关的 depsMap 对应 key 下的依赖集合 dep 中。

### 派发通知：set 函数
派发通知发生在数据更新的阶段 ，由于我们用 Proxy API 劫持了数据对象，所以当这个响应式对象属性更新的时候就会执行 set 函数。我们来看一下 set 函数的实现，它是执行 createSetter 函数的返回值：
```js
function createSetter() {
  return function set(target, key, value, receiver) {
    const oldValue = target[key]
    value = toRaw(value)
    const hadKey = hasOwn(target, key)
    const result = Reflect.set(target, key, value, receiver)
    // 如果目标的原型链也是一个 proxy，通过 Reflect.set 修改原型链上的属性会再次触发 setter，这种情况下就没必要触发两次 trigger 了
    if (target === toRaw(receiver)) {
      if (!hadKey) {
        trigger(target, "add" /* ADD */, key, value)
      }
      else if (hasChanged(value, oldValue)) {
        trigger(target, "set" /* SET */, key, value, oldValue)
      }
    }
    return result
  }
}
```
结合上述代码来看，set 函数的实现逻辑很简单，主要就做两件事情， 首先通过 Reflect.set 求值 ， 然后通过 trigger 函数派发通知 ，并依据 key 是否存在于 target 上来确定通知类型，即新增还是修改。

整个 set 函数最核心的部分就是 执行 trigger 函数派发通知 ，下面我们将重点分析这个过程。

我们先来看一下 trigger 函数的实现，为了分析主要流程，这里省略了 trigger 函数中的一些分支逻辑：
```js
// 原始数据对象 map
const targetMap = new WeakMap()
function trigger(target, type, key, newValue) {
  // 通过 targetMap 拿到 target 对应的依赖集合
  const depsMap = targetMap.get(target)
  if (!depsMap) {
    // 没有依赖，直接返回
    return
  }
  // 创建运行的 effects 集合
  const effects = new Set()
  // 添加 effects 的函数
  const add = (effectsToAdd) => {
    if (effectsToAdd) {
      effectsToAdd.forEach(effect => {
        effects.add(effect)
      })
    }
  }
  // SET | ADD | DELETE 操作之一，添加对应的 effects
  if (key !== void 0) {
    add(depsMap.get(key))
  }
  const run = (effect) => {
    // 调度执行
    if (effect.options.scheduler) {
      effect.options.scheduler(effect)
    }
    else {
      // 直接运行
      effect()
    }
  }
  // 遍历执行 effects
  effects.forEach(run)
}
```
trigger 函数的实现也很简单，主要做了四件事情：
- 通过 targetMap 拿到 target 对应的依赖集合 depsMap；
- 创建运行的 effects 集合；
- 根据 key 从 depsMap 中找到对应的 effects 添加到 effects 集合；
- 遍历 effects 执行相关的副作用函数。

所以每次 trigger 函数就是根据 target 和 key ，从 targetMap 中找到相关的所有副作用函数遍历执行一遍。

在描述依赖收集和派发通知的过程中，我们都提到了一个词：副作用函数，依赖收集过程中我们把 activeEffect（当前激活副作用函数）作为依赖收集。

### 副作用函数
Vue.js 3.0 内部就有一个 effect 副作用函数，我们来看一下它的实现：
```js
// 全局 effect 栈
const effectStack = []
// 当前激活的 effect
let activeEffect
function effect(fn, options = EMPTY_OBJ) {
  if (isEffect(fn)) {
    // 如果 fn 已经是一个 effect 函数了，则指向原始函数
    fn = fn.raw
  }
  // 创建一个 wrapper，它是一个响应式的副作用的函数
  const effect = createReactiveEffect(fn, options)
  if (!options.lazy) {
    // lazy 配置，计算属性会用到，非 lazy 则直接执行一次
    effect()
  }
  return effect
}
function createReactiveEffect(fn, options) {
  const effect = function reactiveEffect(...args) {
    if (!effect.active) {
      // 非激活状态，则判断如果非调度执行，则直接执行原始函数。
      return options.scheduler ? undefined : fn(...args)
    }
    if (!effectStack.includes(effect)) {
      // 清空 effect 引用的依赖
      cleanup(effect)
      try {
        // 开启全局 shouldTrack，允许依赖收集
        enableTracking()
        // 压栈
        effectStack.push(effect)
        activeEffect = effect
        // 执行原始函数
        return fn(...args)
      }
      finally {
        // 出栈
        effectStack.pop()
        // 恢复 shouldTrack 开启之前的状态
        resetTracking()
        // 指向栈最后一个 effect
        activeEffect = effectStack[effectStack.length - 1]
      }
    }
  }
  effect.id = uid++
  // 标识是一个 effect 函数
  effect._isEffect = true
  // effect 自身的状态
  effect.active = true
  // 包装的原始函数
  effect.raw = fn
  // effect 对应的依赖，双向指针，依赖包含对 effect 的引用，effect 也包含对依赖的引用
  effect.deps = []
  // effect 的相关配置
  effect.options = options
  return effect
}
```
结合上述代码来看，effect 内部通过执行 createReactiveEffect 函数去创建一个新的 effect 函数，为了和外部的 effect 函数区分，我们把它称作 reactiveEffect 函数，并且还给它添加了一些额外属性（我在注释中都有标明）。另外，effect 函数还支持传入一个配置参数以支持更多的 feature，我们这里就不展开了，在后续的章节会详细分析。

接着说，这个 reactiveEffect 函数就是响应式的副作用函数，当执行 trigger 过程派发通知的时候，执行的 effect 就是它。

按我们之前的分析，这个 reactiveEffect 函数只需要做两件事情： 把全局的 activeEffect 指向它 ， 然后执行被包装的原始函数 fn 即可 。

但实际上它的实现要更复杂一些，首先它会判断 effect 的状态是否是 active，这其实是一种控制手段，允许在非 active 状态且非调度执行情况，则直接执行原始函数 fn 并返回，在后续学习完侦听器后你会对它的理解更加深刻。

这里我们注意到一个细节，**在入栈前会执行 cleanup 函数清空 reactiveEffect 函数对应的依赖** 。在执行 track 函数的时候，除了收集当前激活的 effect 作为依赖，还通过 activeEffect.deps.push(dep) 把 dep 作为 activeEffect 的依赖，这样在 cleanup 的时候我们就可以找到 effect 对应的 dep 了，然后把 effect 从这些 dep 中删除。cleanup 函数的代码如下所示：
```js
function cleanup(effect) {
  const { deps } = effect
  if (deps.length) {
    for (let i = 0; i < deps.length; i++) {
      deps[i].delete(effect)
    }
    deps.length = 0
  }
}
```
为什么需要 cleanup 呢？主要解决`v-if/v-else`这种场景。PS: 根据留言可参考源码的reactivity模块的单元测试文件effect.ts 搜nested effect。

##### readonly API
其实 readonly 和 reactive 函数的主要区别，就是执行 createReactiveObject 函数时的参数 isReadonly 不同。

##### ref API
我们知道 reactive API 对传入的 target 类型有限制，必须是对象或者数组类型，而对于一些基础类型（比如 String、Number、Boolean）是不支持的。
```js
function ref(value) {
  return createRef(value)
}
const convert = (val) => isObject(val) ? reactive(val) : val
function createRef(rawValue) {
  if (isRef(rawValue)) {
    // 如果传入的就是一个 ref，那么返回自身即可，处理嵌套 ref 的情况。
    return rawValue
  }
  // 如果是对象或者数组类型，则转换一个 reactive 对象。
  let value = convert(rawValue)
  const r = {
    __v_isRef: true,
    get value() {
      // getter
      // 依赖收集，key 为固定的 value
      track(r, "get" /* GET */, 'value')
      return value
    },
    set value(newVal) {
      // setter，只处理 value 属性的修改
      if (hasChanged(toRaw(newVal), rawValue)) {
        // 判断有变化后更新值
        rawValue = newVal
        value = convert(newVal)
        // 派发通知
        trigger(r, "set" /* SET */, 'value', void 0)
      }
    }
  }
  return r
}
```
可以看到，函数首先处理了嵌套 ref 的情况，如果传入的 rawValue 也是 ref，那么直接返回。

接着对 rawValue 做了一层转换，如果 rawValue 是对象或者数组类型，那么把它转换成一个 reactive 对象。

最后定义一个对 value 属性做 getter 和 setter 劫持的对象并返回，get 部分就是执行 track 函数做依赖收集然后返回它的值；set 部分就是设置新值并且执行 trigger 函数派发通知。

## 总结
通过这节课的学习，你能搞明白响应式 API 的实现原理，知道什么时候收集依赖，什么时候派发更新，以及副作用函数的作用和设计原理。同时知道 reactive、readonly、ref 三种 API 的区别和各自的使用场景。
![](https://upload-images.jianshu.io/upload_images/3061147-acde50e2a9698f13.png?imageMogr2/auto-orient/strip%7CimageView2/2/w/1240)

其实 Vue.js 3.0 在响应式的实现思路和 Vue.js 2.x 差别并不大，主要就是**劫持数据的方式改成用 Proxy 实现， 以及收集的依赖由 watcher 实例变成了组件副作用渲染函数**。

> 思考：为什么说 Vue.js 3 的响应式 API 实现和 Vue.js 2.x 相比性能要好，具体好在哪里呢？它又有哪些不足呢？