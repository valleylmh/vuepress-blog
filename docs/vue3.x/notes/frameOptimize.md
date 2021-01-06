# vue3.0的优化
在迭代 2.x 版本的过程中，尤大发现了很多需要解决的痛点，比如源码自身的维护性，数据量大后带来的渲染和更新的性能问题，一些想舍弃但为了兼容一直保留的鸡肋 API 等；另外，尤大还希望能给开发人员带来更好的编程体验，比如更好的 TypeScript 支持、更好的逻辑复用实践等，所以他希望能从**源码、性能和语法 API**三个大的方面优化框架。

## 源码优化
源码的优化主要体现在使用 monorepo 和 TypeScript 管理和开发源码，这样做的目标是提升自身代码可维护性。
### 1. 更好的代码管理方式：monorepo
首先，源码的优化体现在代码管理方式上。Vue.js 2.x 的源码托管在 src 目录，然后依据功能拆分出了 compiler（模板编译的相关代码）、core（与平台无关的通用运行时代码）、platforms（平台专有代码）、server（服务端渲染的相关代码）、sfc（.vue 单文件解析相关代码）、shared（共享工具代码） 等目录：

![](https://upload-images.jianshu.io/upload_images/3061147-514c577b8ce2e2bc.png?imageMogr2/auto-orient/strip%7CimageView2/2/w/1240)

而到了 Vue.js 3.0 ，整个源码是通过 monorepo 的方式维护的，根据功能将不同的模块拆分到 packages 目录下面不同的子目录中：

![](https://upload-images.jianshu.io/upload_images/3061147-fe7eced4aad6ad81.png?imageMogr2/auto-orient/strip%7CimageView2/2/w/1240)

可以看出相对于 Vue.js 2.x 的源码组织方式，monorepo 把这些模块拆分到不同的 package 中，每个 package 有各自的 API、类型定义和测试。这样使得模块拆分更细化，职责划分更明确，模块之间的依赖关系也更加明确，开发人员也更容易阅读、理解和更改所有模块源码，提高代码的可维护性。

另外一些 package（比如 reactivity 响应式库）是可以独立于 Vue.js 使用的，这样用户如果只想使用 Vue.js 3.0 的响应式能力，可以单独依赖这个响应式库而不用去依赖整个 Vue.js，减小了引用包的体积大小，而 Vue.js 2 .x 是做不到这一点的。

### 2. 有类型的 JavaScript：TypeScript
Vue.js 3.0 抛弃 2.x版本的Flow 后，使用 TypeScript 重构了整个项目。 TypeScript提供了更好的类型检查，能支持复杂的类型推导；由于源码就使用 TypeScript 编写，也省去了单独维护 d.ts 文件的麻烦；就整个 TypeScript 的生态来看，TypeScript 团队也是越做越好，TypeScript 本身保持着一定频率的迭代和更新，支持的 feature 也越来越多。

## 性能优化
### 1. 源码体积优化
- 首先，移除一些冷门的 feature（比如 filter、inline-template 等）；
- 其次，引入 tree-shaking 的技术，减少打包体积。

### 2. 数据劫持优化
Vue.js 2.x 内部都是通过 Object.defineProperty 这个 API 去劫持数据的 getter 和 setter。
```js
Object.defineProperty(data, 'a',{
  get(){
    // track
  },
  set(){
    // trigger
  }
})
```
但这个 API 有一些缺陷，它必须预先知道要拦截的 key 是什么，所以它并不能检测对象属性的添加和删除。尽管 Vue.js 为了解决这个问题提供了 $set 和 $delete 实例方法，但是对于用户来说，还是增加了一定的心智负担。
另外是嵌套很深的对象定义成响应式，数据过于复杂，这就会有相当大的性能负担。

Vue.js 3.0 使用了 Proxy API 做数据劫持，它的内部是这样的：
```js
observed = new Proxy(data, {
  get() {
    // track
  },
  set() {
    // trigger
  }
})
```
由于它劫持的是整个对象，那么自然对于对象的属性的增加和删除都能检测到。
注意，Proxy API 并不能监听到内部深层次的对象变化，因此 Vue.js 3.0 的处理方式是在 getter 中去递归响应式，这样的好处是真正访问到的内部对象才会变成响应式，而不是无脑递归，这样无疑也在很大程度上提升了性能。

### 3. 编译优化
优化整个 Vue.js 的运行时，除了数据劫持部分的优化，我们可以在耗时相对较多的 patch 阶段想办法标记静态类型优化。
Vue2.x更新组件，会遍历整个VNode。比如：
```js
<template>
  <div id="content">
    <p class="text">static text</p>
    <p class="text">static text</p>
    <p class="text">{{message}}</p>
    <p class="text">static text</p>
    <p class="text">static text</p>
  </div>
</template>
```
整个diff过程
![](https://upload-images.jianshu.io/upload_images/3061147-edc660b101605d77.png?imageMogr2/auto-orient/strip%7CimageView2/2/w/1240)

可以看到，因为这段代码中只有一个动态节点，所以这里有很多 diff 和遍历其实都是不需要的，这就会导致 vnode 的性能跟模版大小正相关，跟动态节点的数量无关，当一些组件的整个模版内只有少量动态节点时，这些遍历都是性能的浪费。

而对于上述例子，理想状态只需要 diff 这个绑定 message 动态节点的 p 标签即可。

Vue.js 3.0 做到了，它通过编译阶段对静态模板的分析，编译生成了 Block tree。Block tree 是一个将模版基于动态节点指令切割的嵌套区块，每个区块内部的节点结构是固定的，而且每个区块只需要以一个 Array 来追踪自身包含的动态节点。借助 Block tree，Vue.js 将 **vnode 更新性能**由与模版整体大小相关提升为**与动态内容的数量相关**，这是一个非常大的性能突破，我会在后续的章节详细分析它是如何实现的。

除此之外，Vue.js 3.0 在编译阶段还包含了对 Slot 的编译优化、事件侦听函数的缓存优化，并且在运行时重写了 diff 算法，些性能优化的内容后续特定的章节笔记分享。

## 语法 API 优化：Composition API
### 1. 优化逻辑组织
> 2.x版本编写组件本质就是在编写一个 **“包含了描述组件选项的对象”**。

Options API 的设计是按照 methods、computed、data、props 这些不同的选项分类，当组件小的时候，这种分类方式一目了然；但是在大型组件中，一个组件可能有多个逻辑关注点，当使用 Options API 的时候，每一个关注点都有自己的 Options，*如果需要修改一个逻辑点关注点，就需要在单个文件中不断上下切换和寻找*。

### 2. 优化逻辑复用
2.x版本对逻辑复用，主要使用mixin混入。当我们一个组件混入大量不同的 mixins 的时候，会存在两个非常明显的问题：命名冲突和数据来源不清晰。3.x版本设计的 Composition API，就很好地帮助我们解决了 mixins 的这两个问题。

