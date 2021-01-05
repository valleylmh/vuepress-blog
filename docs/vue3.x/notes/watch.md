# 侦听器：侦听器的实现原理和使用场景是什么？
## watch API 的用法
1.watch API 可以侦听一个 getter 函数，但是它必须返回一个响应式对象，当该响应式对象更新后，会执行对应的回调函数。
```js
import { reactive, watch } from 'vue' 
const state = reactive({ count: 0 }) 
watch(() => state.count, (count, prevCount) => { 
  // 当 state.count 更新，会触发此回调函数 
}) 
```
2.watch API 也可以直接侦听一个响应式对象，当响应式对象更新后，会执行对应的回调函数。
```js
import { ref, watch } from 'vue' 
const count = ref(0) 
watch(count, (count, prevCount) => { 
  // 当 count.value 更新，会触发此回调函数 
}) 
```
3.watch API 还可以直接侦听多个响应式对象，任意一个响应式对象更新后，就会执行对应的回调函数。
```js
import { ref, watch } from 'vue' 
const count = ref(0) 
const count2 = ref(1) 
watch([count, count2], ([count, count2], [prevCount, prevCount2]) => { 
  // 当 count.value 或者 count2.value 更新，会触发此回调函数 
}) 
```
## watch API 实现原理
侦听器的言下之意就是，当侦听的对象或者函数发生了变化则自动执行某个回调函数，这和我们前面说过的副作用函数 effect 很像， 那它的内部实现是不是依赖了 effect 呢？带着这个疑问，我们来探究 watch API 的具体实现：
```js
function watch(source, cb, options) { 
  if ((process.env.NODE_ENV !== 'production') && !isFunction(cb)) { 
    warn(`\`watch(fn, options?)\` signature has been moved to a separate API. ` + 
      `Use \`watchEffect(fn, options?)\` instead. \`watch\` now only ` + 
      `supports \`watch(source, cb, options?) signature.`) 
  } 
  return doWatch(source, cb, options) 
} 
function doWatch(source, cb, { immediate, deep, flush, onTrack, onTrigger } = EMPTY_OBJ) { 
  // 标准化 source 
  // 构造 applyCb 回调函数 
  // 创建 scheduler 时序执行函数 
  // 创建 effect 副作用函数 
  // 返回侦听器销毁函数 
}    
```
从代码中可以看到，watch 函数内部调用了 doWatch 函数，调用前会在非生产环境下判断第二个参数 cb 是不是一个函数，如果不是则会报警告以告诉用户应该使用 watchEffect(fn, options) API，watchEffect API 也是侦听器相关的 API，稍后我们会详细介绍。
这个 doWatch 函数很长，用注释将这个函数的实现逻辑拆解成了几个步骤。可以看到，内部确实创建了 effect 副作用函数。

### 标准化 source
通过前文知道 source 可以是 getter 函数，也可以是响应式对象甚至是响应式对象数组，所以我们需要标准化 source，这是标准化 source 的流程：
```js
// source 不合法的时候会报警告 
const warnInvalidSource = (s) => { 
  warn(`Invalid watch source: `, s, `A watch source can only be a getter/effect function, a ref, ` + 
    `a reactive object, or an array of these types.`) 
} 
// 当前组件实例 
const instance = currentInstance 
let getter 
if (isArray(source)) { 
  getter = () => source.map(s => { 
    if (isRef(s)) { 
      return s.value 
    } 
    else if (isReactive(s)) { 
      return traverse(s) 
    } 
    else if (isFunction(s)) { 
      return callWithErrorHandling(s, instance, 2 /* WATCH_GETTER */) 
    } 
    else { 
      (process.env.NODE_ENV !== 'production') && warnInvalidSource(s) 
    } 
  }) 
} 
else if (isRef(source)) { 
  getter = () => source.value 
} 
else if (isReactive(source)) { 
  getter = () => source 
  deep = true 
} 
else if (isFunction(source)) { 
  if (cb) { 
    // getter with cb 
    getter = () => callWithErrorHandling(source, instance, 2 /* WATCH_GETTER */) 
  } 
  else { 
    // watchEffect 的逻辑 
  } 
} 
else { 
  getter = NOOP 
  (process.env.NODE_ENV !== 'production') && warnInvalidSource(source) 
} 
if (cb && deep) { 
  const baseGetter = getter 
  getter = () => traverse(baseGetter()) 
} 
```
source 标准化主要是根据 source 的类型，将其变成 getter 函数:
- 如果 source 是 ref 对象，则创建一个访问 source.value 的 getter 函数;
- 如果 source 是 reactive 对象，则创建一个访问 source 的 getter 函数，并设置 deep 为 true（deep 的作用我稍后会说）;
- 如果 source 是一个函数，则会进一步判断第二个参数 cb 是否存在，对于 watch API 来说，cb 是一定存在且是一个回调函数，这种情况下，getter 就是一个简单的对 source 函数封装的函数。

如果 source 不满足上述条件，则在非生产环境下报警告，提示 source 类型不合法。

### 构造回调函数
处理完 watch API 第一个参数 source 后，接下来处理第二个参数 cb。
cb 是一个回调函数，它有三个参数：第一个 newValue 代表新值；第二个 oldValue 代表旧值。第三个参数 onInvalidate，我打算放在后面介绍。

其实这样的 API 设计非常好理解，即侦听一个值的变化，如果值变了就执行回调函数，回调函数里可以访问到新值和旧值。
接下来我们来看一下构造回调函数的处理逻辑：
```js
let cleanup 
// 注册无效回调函数 
const onInvalidate = (fn) => { 
  cleanup = runner.options.onStop = () => { 
    callWithErrorHandling(fn, instance, 4 /* WATCH_CLEANUP */) 
  } 
} 
// 旧值初始值 
let oldValue = isArray(source) ? [] : INITIAL_WATCHER_VALUE /*{}*/ 
// 回调函数 
const applyCb = cb 
  ? () => { 
    // 组件销毁，则直接返回 
    if (instance && instance.isUnmounted) { 
      return 
    } 
    // 求得新值 
    const newValue = runner() 
    if (deep || hasChanged(newValue, oldValue)) { 
      // 执行清理函数 
      if (cleanup) { 
        cleanup() 
      } 
      callWithAsyncErrorHandling(cb, instance, 3 /* WATCH_CALLBACK */, [ 
        newValue, 
        // 第一次更改时传递旧值为 undefined 
        oldValue === INITIAL_WATCHER_VALUE ? undefined : oldValue, 
        onInvalidate 
      ]) 
      // 更新旧值 
      oldValue = newValue 
    } 
  } 
  : void 0
```
onInvalidate 函数用来注册无效回调函数 ，我们暂时不需要关注它，我们需要重点来看 applyCb。 这个函数实际上就是对 cb 做一层封装，当侦听的值发生变化时就会执行 applyCb 方法，我们来分析一下它的实现。

首先，watch API 和组件实例相关，因为通常我们会在组件的 setup 函数中使用它，当组件销毁后，回调函数 cb 不应该被执行而是直接返回。

接着，执行 runner 求得新值，这里实际上就是执行前面创建的 getter 函数求新值。

最后进行判断，如果是 deep 的情况或者新旧值发生了变化，则执行回调函数 cb，传入参数 newValue 和 oldValue。注意，第一次执行的时候旧值的初始值是空数组或者 undefined。执行完回调函数 cb 后，把旧值 oldValue 再更新为 newValue，这是为了下一次的比对。

### 创建 scheduler
scheduler 的作用是根据某种调度的方式去执行某种函数，在 watch API 中，主要影响到的是回调函数的执行方式。我们来看一下它的实现逻辑：
```js
const invoke = (fn) => fn() 
let scheduler 
if (flush === 'sync') { 
  // 同步 
  scheduler = invoke 
} 
else if (flush === 'pre') { 
  scheduler = job => { 
    if (!instance || instance.isMounted) { 
      // 进入异步队列，组件更新前执行 
      queueJob(job) 
    } 
    else { 
      // 如果组件还没挂载，则同步执行确保在组件挂载前 
      job() 
    } 
  } 
} 
else { 
  // 进入异步队列，组件更新后执行 
  scheduler = job => queuePostRenderEffect(job, instance && instance.suspense) 
} 
```
Watch API 的参数除了 source 和 cb，还支持第三个参数 options，不同的配置决定了 watcher 的不同行为。前面我们也分析了 deep 为 true 的情况，除了 source 为 reactive 对象时会默认把 deep 设置为 true，你也可以主动传入第三个参数，把 deep 设置为 true。

这里，scheduler 的创建逻辑受到了第三个参数 Options 中的 flush 属性值的影响，不同的 flush 决定了 watcher 的执行时机。
- 当 flush 为 sync 的时候，表示它是一个同步 watcher，即当数据变化时同步执行回调函数。
- 当 flush 为 pre 的时候，回调函数通过 queueJob 的方式在组件更新之前执行，如果组件还没挂载，则同步执行确保回调函数在组件挂载之前执行。
- 如果没设置 flush，那么回调函数通过 queuePostRenderEffect 的方式在组件更新之后执行。

queueJob 和 queuePostRenderEffect 在这里不是重点，所以我们放到后面介绍。总之，你现在要记住，watcher 的回调函数是通过一定的调度方式执行的。

### 创建 effect
前面的分析我们提到了 runner，它其实就是 watcher 内部创建的 effect 函数，接下来，我们来分析它逻辑：
```js
const runner = effect(getter, { 
  // 延时执行 
  lazy: true, 
  // computed effect 可以优先于普通的 effect 先运行，比如组件渲染的 effect 
  computed: true, 
  onTrack, 
  onTrigger, 
  scheduler: applyCb ? () => scheduler(applyCb) : scheduler 
}) 
// 在组件实例中记录这个 effect 
recordInstanceBoundEffect(runner) 
// 初次执行 
if (applyCb) { 
  if (immediate) { 
    applyCb() 
  } 
  else { 
    // 求旧值 
    oldValue = runner() 
  } 
} 
else { 
  // 没有 cb 的情况 
  runner() 
} 
```
这块代码逻辑是整个 watcher 实现的核心部分，即通过 effect API 创建一个副作用函数 runner，我们需要关注以下几点。
- **runner 是一个 computed effect**。因为 computed effect 可以优先于普通的 effect（比如组件渲染的 effect）先运行，这样就可以实现当配置 flush 为 pre 的时候，watcher 的执行可以优先于组件更新。
- **runner 执行的方式**。`runner 是 lazy 的，它不会在创建后立刻执行`。第一次手动执行 runner 会执行前面的 getter 函数，访问响应式数据并做依赖收集。注意，此时activeEffect 就是 runner，这样在后面更新响应式数据时，就可以触发 runner 执行 scheduler 函数，以一种调度方式来执行回调函数。
- runner 的返回结果。手动执行 runner 就相当于执行了前面标准化的 getter 函数，getter 函数的返回值就是 watcher 计算出的值，所以我们第一次执行 runner 求得的值可以作为 oldValue。
- **配置了 immediate 的情况**。当我们配置了 immediate ，创建完 watcher 会立刻执行 applyCb 函数，此时 oldValue 还是初始值，在 applyCb 执行时也会执行 runner 进而执行前面的 getter 函数做依赖收集，求得新值。

### 返回销毁函数
最后，会返回侦听器销毁函数，也就是 watch API 执行后返回的函数。我们可以通过调用它来停止 watcher 对数据的侦听。
```js
return () => { 
  stop(runner) 
  if (instance) { 
    // 移除组件 effects 对这个 runner 的引用 
    remove(instance.effects, runner) 
  } 
} 
function stop(effect) { 
  if (effect.active) { 
    cleanup(effect) 
    if (effect.options.onStop) { 
      effect.options.onStop() 
    } 
    effect.active = false 
  } 
} 
```
销毁函数内部会执行 stop 方法让 runner 失活，并清理 runner 的相关依赖，这样就可以停止对数据的侦听。并且，如果是在组件中注册的 watcher，也会移除组件 effects 对这个 runner 的引用。

## 异步任务队列的设计
> 组件的更新过程是异步的，我们知道修改模板中引用的响应式对象的值时，会触发组件的重新渲染，但是在一个 Tick 内，即使你多次修改多个响应式对象的值，组件的重新渲染也只执行一次。这是因为如果每次更新数据都触发组件重新渲染，那么重新渲染的次数和代价都太高了。

### 异步任务队列的创建
在创建一个 watcher 时，如果配置 flush 为 sync 或不配置 flush ，那么 watcher 的回调函数就会异步执行。此时分别是通过 `queueJob` 和`queuePostRenderEffect` 把回调函数推入异步队列中的。

在不涉及 suspense 的情况下，queuePostRenderEffect 相当于 queuePostFlushCb，我们来看它们的实现：
```js
// 异步任务队列 
const queue = [] 
// 队列任务执行完后执行的回调函数队列 
const postFlushCbs = [] 
function queueJob(job) { 
  if (!queue.includes(job)) { 
    queue.push(job) 
    queueFlush() 
  } 
} 
function queuePostFlushCb(cb) { 
  if (!isArray(cb)) { 
    postFlushCbs.push(cb) 
  } 
  else { 
    // 如果是数组，把它拍平成一维 
    postFlushCbs.push(...cb) 
  } 
  queueFlush() 
} 
```
Vue.js 内部维护了一个 queue 数组和一个 postFlushCbs 数组，其中 queue 数组用作异步任务队列， postFlushCbs 数组用作异步任务队列执行完毕后的回调函数队列。

执行 queueJob 时会把这个任务 job 添加到 queue 的队尾，而执行 queuePostFlushCb 时，会把这个 cb 回调函数添加到 postFlushCbs 的队尾。它们在添加完毕后都执行了 queueFlush 函数，我们接着看它的实现：
```js
const p = Promise.resolve() 
// 异步任务队列是否正在执行 
let isFlushing = false 
// 异步任务队列是否等待执行 
let isFlushPending = false 
function nextTick(fn) { 
  return fn ? p.then(fn) : p 
} 
function queueFlush() { 
  if (!isFlushing && !isFlushPending) { 
    isFlushPending = true 
    nextTick(flushJobs) 
  } 
} 
```
可以看到，Vue.js 内部还维护了 isFlushing 和 isFlushPending 变量，用来控制异步任务的刷新逻辑。

在 queueFlush 首次执行时，isFlushing 和 isFlushPending 都是 false，此时会把 isFlushPending 设置为 true，并且调用 nextTick(flushJobs) 去执行队列里的任务。

因为 isFlushPending 的控制，这使得即使多次执行 queueFlush，也不会多次去执行 flushJobs。另外 nextTick 在 Vue.js 3.0 中的实现也是非常简单，通过 Promise.resolve().then 去异步执行 flushJobs。

因为 JavaScript 是单线程执行的，这样的异步设计使你在一个 Tick 内，可以多次执行 queueJob 或者 queuePostFlushCb 去添加任务，也可以保证在宏任务执行完毕后的微任务阶段执行一次 flushJobs。

### 异步任务队列的执行
创建完任务队列后，接下来要异步执行这个队列，我们来看一下 flushJobs 的实现：
```js
const getId = (job) => (job.id == null ? Infinity : job.id) 
function flushJobs(seen) { 
  isFlushPending = false 
  isFlushing = true 
  let job 
  if ((process.env.NODE_ENV !== 'production')) { 
    seen = seen || new Map() 
  } 
  // 组件的更新是先父后子 
  // 如果一个组件在父组件更新过程中卸载，它自身的更新应该被跳过 
  queue.sort((a, b) => getId(a) - getId(b)) 
  while ((job = queue.shift()) !== undefined) { 
    if (job === null) { 
      continue 
    } 
    if ((process.env.NODE_ENV !== 'production')) { 
      checkRecursiveUpdates(seen, job) 
    } 
    callWithErrorHandling(job, null, 14 /* SCHEDULER */) 
  } 
  flushPostFlushCbs(seen) 
  isFlushing = false 
  // 一些 postFlushCb 执行过程中会再次添加异步任务，递归 flushJobs 会把它们都执行完毕 
  if (queue.length || postFlushCbs.length) { 
    flushJobs(seen) 
  } 
} 
```
可以看到，flushJobs 函数开始执行的时候，会把 isFlushPending 重置为 false，把 isFlushing 设置为 true 来表示正在执行异步任务队列。

对于异步任务队列 queue，在遍历执行它们前会先对它们做一次从小到大的排序，这是因为两个主要原因：
- 我们创建组件的过程是由父到子，所以创建组件副作用渲染函数也是先父后子，父组件的副作用渲染函数的 effect id 是小于子组件的，每次更新组件也是通过 queueJob 把 effect 推入异步任务队列 queue 中的。所以为了保证先更新父组再更新子组件，要对 queue 做从小到大的排序。
- 如果一个组件在父组件更新过程中被卸载，它自身的更新应该被跳过。所以也应该要保证先更新父组件再更新子组件，要对 queue 做从小到大的排序。

接下来，就是遍历这个 queue，依次执行队列中的任务了，在遍历过程中，注意有一个 checkRecursiveUpdates 的逻辑，它是用来在非生产环境下检测是否有循环更新的，它的作用我们稍后会提。

遍历完 queue 后，又会进一步执行 flushPostFlushCbs 方法去遍历执行所有推入到 postFlushCbs 的回调函数：
```js
function flushPostFlushCbs(seen) { 
  if (postFlushCbs.length) { 
    // 拷贝副本 
    const cbs = [...new Set(postFlushCbs)] 
    postFlushCbs.length = 0 
    if ((process.env.NODE_ENV !== 'production')) { 
      seen = seen || new Map() 
    } 
    for (let i = 0; i < cbs.length; i++) { 
      if ((process.env.NODE_ENV !== 'production')) {                                                       
        checkRecursiveUpdates(seen, cbs[i]) 
      } 
      cbs[i]() 
    } 
  } 
} 
```
注意这里遍历前会通过 const cbs = [...new Set(postFlushCbs)] 拷贝一个 postFlushCbs 的副本，这是因为在遍历的过程中，可能某些回调函数的执行会再次修改 postFlushCbs，所以拷贝一个副本循环遍历则不会受到 postFlushCbs 修改的影响。

遍历完 postFlushCbs 后，会重置 isFlushing 为 false，因为一些 postFlushCb 执行过程中可能会再次添加异步任务，所以需要继续判断如果 queue 或者 postFlushCbs 队列中还存在任务，则递归执行 flushJobs 把它们都执行完毕。

#### 检测循环更新
在遍历执行异步任务和回调函数的过程中，都会在非生产环境下执行 checkRecursiveUpdates 检测是否有循环更新，它是用来解决什么问题的呢？
```js
import { reactive, watch } from 'vue' 
const state = reactive({ count: 0 }) 
watch(() => state.count, (count, prevCount) => { 
  state.count++ 
  console.log(count) 
}) 
state.count++ 
```
如果你去跑这个示例，你会在控制台看到输出了 101 次值，然后报了错误： Maximum recursive updates exceeded 。这是因为我们在 watcher 的回调函数里更新了数据，这样会再一次进入回调函数，如果我们不加任何控制，那么回调函数会一直执行，直到把内存耗尽造成浏览器假死。
为了避免这种情况，Vue.js 实现了 checkRecursiveUpdates 方法：
```js
const RECURSION_LIMIT = 100 
function checkRecursiveUpdates(seen, fn) { 
  if (!seen.has(fn)) { 
    seen.set(fn, 1) 
  } 
  else { 
    const count = seen.get(fn) 
    if (count > RECURSION_LIMIT) { 
      throw new Error('Maximum recursive updates exceeded. ' + 
        "You may have code that is mutating state in your component's " + 
        'render function or updated hook or watcher source function.') 
    } 
    else { 
      seen.set(fn, count + 1) 
    } 
  } 
} 
```
通过前面的代码，我们知道 flushJobs 一开始便创建了 seen，它是一个 Map 对象，然后在 checkRecursiveUpdates 的时候会把任务添加到 seen 中，记录引用计数 count，初始值为 1，如果 postFlushCbs 再次添加了相同的任务，则引用计数 count 加 1，如果 count 大于我们定义的限制 100 ，则说明一直在添加这个相同的任务并超过了 100 次。那么，Vue.js 会抛出这个错误，因为在正常的使用中，不应该出现这种情况，而我们上述的错误示例就会触发这种报错逻辑。

## watchEffect API
watchEffect API 的作用是注册一个副作用函数，副作用函数内部可以访问到响应式对象，当内部响应式对象变化后再立即执行这个函数。
watchEffect 和前面的 watch API 有哪些不同呢？主要有三点：
- 1. 侦听的源不同 。watch API 可以侦听一个或多个响应式对象，也可以侦听一个 getter 函数，而 watchEffect API 侦听的是一个普通函数，只要内部访问了响应式对象即可，这个函数并不需要返回响应式对象。
- 2. 没有回调函数 。watchEffect API 没有回调函数，副作用函数的内部响应式对象发生变化后，会再次执行这个副作用函数。
- 3. 立即执行 。watchEffect API 在创建好 watcher 后，会立刻执行它的副作用函数，而 watch API 需要配置 immediate 为 true，才会立即执行回调函数。

对 watchEffect API 有大体了解后，我们来看一下在我整理的 watchEffect 场景下， doWatch 函数的简化版实现：
```js
function watchEffect(effect, options) { 
  return doWatch(effect, null, options); 
} 
function doWatch(source, cb, { immediate, deep, flush, onTrack, onTrigger } = EMPTY_OBJ) { 
  instance = currentInstance; 
  let getter; 
  if (isFunction(source)) { 
    getter = () => { 
      if (instance && instance.isUnmounted) { 
        return; 
      } 
       // 执行清理函数 
      if (cleanup) { 
        cleanup(); 
      } 
      // 执行 source 函数，传入 onInvalidate 作为参数 
      return callWithErrorHandling(source, instance, 3 /* WATCH_CALLBACK */, [onInvalidate]); 
    }; 
  } 
  let cleanup; 
  const onInvalidate = (fn) => { 
    cleanup = runner.options.onStop = () => { 
      callWithErrorHandling(fn, instance, 4 /* WATCH_CLEANUP */); 
    }; 
  }; 
  let scheduler; 
  // 创建 scheduler 
  if (flush === 'sync') { 
    scheduler = invoke; 
  } 
  else if (flush === 'pre') { 
    scheduler = job => { 
      if (!instance || instance.isMounted) { 
        queueJob(job); 
      } 
      else { 
        job(); 
      } 
    }; 
  } 
  else { 
    scheduler = job => queuePostRenderEffect(job, instance && instance.suspense); 
  } 
  // 创建 runner 
  const runner = effect(getter, { 
    lazy: true, 
    computed: true, 
    onTrack, 
    onTrigger, 
    scheduler 
  }); 
  recordInstanceBoundEffect(runner); 
  // 立即执行 runner 
  runner(); 
  // 返回销毁函数 
  return () => { 
    stop(runner); 
    if (instance) { 
      remove(instance.effects, runner); 
    } 
  }; 
} 
```
可以看到，getter 函数就是对 source 函数的简单封装，它会先判断组件实例是否已经销毁，然后每次执行 source 函数前执行 cleanup 清理函数。

watchEffect 内部创建的 runner 对应的 scheduler 对象就是 scheduler 函数本身，这样它再次执行时，就会执行这个 scheduler 函数，并且传入 runner 函数作为参数，其实就是按照一定的调度方式去执行基于 source 封装的 getter 函数。

创建完 runner 后就立刻执行了 runner，其实就是内部同步执行了基于 source 封装的 getter 函数。

在执行 source 函数的时候，会传入一个 onInvalidate 函数作为参数，接下来我们就来分析它的作用。

### 注册无效回调函数
有些时候，watchEffect 会注册一个副作用函数，在函数内部可以做一些异步操作，但是当这个 watcher 停止后，如果我们想去对这个异步操作做一些额外事情（比如取消这个异步操作），我们可以通过 onInvalidate 参数注册一个无效函数。
```js
import {ref, watchEffect } from 'vue' 
const id = ref(0) 
watchEffect(onInvalidate => { 
  // 执行异步操作 
  const token = performAsyncOperation(id.value) 
  onInvalidate(() => { 
    // 如果 id 发生变化或者 watcher 停止了，则执行逻辑取消前面的异步操作 
    token.cancel() 
  }) 
}) 
```
我们利用 watchEffect 注册了一个副作用函数，它有一个 onInvalidate 参数。在这个函数内部通过 performAsyncOperation 执行某些异步操作，并且访问了 id 这个响应式对象，然后通过 onInvalidate 注册了一个回调函数。

如果 id 发生变化或者 watcher 停止了，这个回调函数将会执行，然后执行 token.cancel 取消之前的异步操作。

我们来回顾 onInvalidate 在 doWatch 中的实现：
```js
const onInvalidate = (fn) => { 
  cleanup = runner.options.onStop = () => { 
    callWithErrorHandling(fn, instance, 4 /* WATCH_CLEANUP */); 
  }; 
}; 
```
实际上，当你执行 onInvalidate 的时候，就是注册了一个 cleanup 和 runner 的 onStop 方法，这个方法内部会执行 fn，也就是你注册的无效回调函数。

也就是说当响应式数据发生变化，会执行 cleanup 方法，当 watcher 被停止，会执行 onStop 方法，这两者都会执行注册的无效回调函数 fn。

通过这种方式，Vue.js 就很好地实现了 watcher 注册无效回调函数的需求。

## 总结
好的，到这里我们这一节的学习也要结束啦，通过这节课的学习，你应该掌握了侦听器内部实现原理，了解侦听器支持的几种配置参数的作用，以及异步任务队列的设计原理。

你也应该掌握侦听器的常见应用场景：如何用 watch API 观测数据的变化去执行一些逻辑，如何利用 watchEffect API 去注册一些副作用函数，如何去注册无效回调函数，以及如何停止一个正在运行的 watcher。

相比于计算属性，侦听器更适合用于在数据变化后执行某段逻辑的场景，而计算属性则用于一个数据依赖另外一些数据计算而来的场景。

> 思考题：在组件中创建的自定义 watcher，在组件销毁的时候会被销毁吗？是如何做的呢？