# 依赖注入：子孙组件如何共享数据？
Vue.js 为我们提供了很多组件通讯的方式，常见的是父子组件通过 prop 传递数据。但是有时，我们希望能跨父子组件通讯，比如，无论组件之间嵌套多少层级，我都希望在后代组件中能访问它们祖先组件的数据。

Vue.js 2.x 使用provide/inject写法：
```js
// Provider 
export default { 
  provide: function () { 
    return { 
      foo: this.foo 
    } 
  } 
}
// 后代子孙 Consumer 
export default { 
  inject: ['foo'] 
}
```
Vue.js 3.0除了可以继续沿用这种 Options 的依赖注入，还可以使用依赖注入的 API 函数 provide 和 inject，你可以在 setup 函数中调用它们。
```js
// Provider 
import { provide, ref } from 'vue' 
export default { 
  setup() { 
    const theme = ref('dark') 
    provide('theme', theme) 
  } 
}

// Consumer 
import { inject } from 'vue' 
export default { 
  setup() { 
    const theme = inject('theme', 'light') 
    return { 
      theme 
    } 
  } 
}
```
这里要说明的是，inject 函数接受第二个参数作为默认值，如果祖先组件上下文没有提供 theme，则使用这个默认值。

实际上，你可以把依赖注入看作一部分“大范围有效的 prop”，而且它的规则更加宽松：**祖先组件不需要知道哪些后代组件在使用它提供的数据，后代组件也不需要知道注入的数据来自哪里**。

## provide API
```js
function provide(key, value) { 
  let provides = currentInstance.provides 
  const parentProvides = currentInstance.parent && currentInstance.parent.provides 
  if (parentProvides === provides) { 
    provides = currentInstance.provides = Object.create(parentProvides) 
  } 
  provides[key] = value 
}
```
在创建组件实例的时候，组件实例的 provides 对象指向父组件实例的 provides 对象：
```js
const instance = { 
  // 依赖注入相关 
  provides: parent ? parent.provides : Object.create(appContext.provides), 
  // 其它属性 
  // ... 
}
```
![](https://upload-images.jianshu.io/upload_images/3061147-3c72f96a6c01b878.png?imageMogr2/auto-orient/strip%7CimageView2/2/w/1240)

所以在默认情况下，组件实例的 provides 继承它的父组件，但是当组件实例需要提供自己的值的时候，*它使用父级提供的对象创建自己的 provides 的对象原型。通过这种方式，在 inject 阶段，我们可以非常容易通过原型链查找来自直接父级提供的数据*。

## inject API
```js
function inject(key, defaultValue) { 
  const instance = currentInstance || currentRenderingInstance 
  if (instance) { 
    const provides = instance.provides 
    if (key in provides) { 
      return provides[key] 
    } 
    else if (arguments.length > 1) { 
      return defaultValue 
    } 
    else if ((process.env.NODE_ENV !== 'production')) { 
      warn(`injection "${String(key)}" not found.`) 
    } 
  } 
}
```
> Vue.js 3 跨组件共享数据，为何要用 provide/inject ？直接 export/import 数据行吗？

## 对比模块化共享数据的方式
```js
// Root.js 
export const sharedData = ref('') 
export default { 
  name: 'Root', 
  setup() {
    // ... 
  },
}
// 在子组件中使用 sharedData
import { sharedData } from './Root.js' 
export default { 
  name: 'Root', 
  setup() {
    // 这里直接使用 sharedData 即可 
  } 
}
```
从这个示例上来看，模块化的方式是可以共享数据，但是 provide 和 inject 与模块化方式有如下几点不同。

- 作用域不同
对于依赖注入，它的作用域是局部范围，所以你只能把数据注入以这个节点为根的后代组件中，不是这棵子树上的组件是不能访问到该数据的；而对于模块化的方式，它的作用域是全局范围的，你可以在任何地方引用它导出的数据。

- 数据来源不同
对于依赖注入，后代组件是不需要知道注入的数据来自哪里，只管注入并使用即可；而对于模块化的方式提供的数据，用户必须明确知道这个数据是在哪个模块定义的，从而引入它。

- 上下文不同
对于依赖注入，提供数据的组件的上下文就是组件实例，而且同一个组件定义是可以有多个组件实例的，我们可以根据不同的组件上下文提供不同的数据给后代组件；而对于模块化提供的数据，它是没有任何上下文的，仅仅是这个模块定义的数据，如果想要根据不同的情况提供不同数据，那么从 API 层面设计就需要做更改`把上下文参数appContext传参进去`。

## 依赖注入的缺陷和应用场景
缺陷：如果在一次重构中我们不小心挪动了有依赖注入的后代组件的位置，或者是挪动了提供数据的祖先组件的位置，都有可能导致后代组件丢失注入的数据，进而导致应用程序异常。
应用场景：在组件库的开发中使用，因为对于一个特定组件，它和其嵌套的子组件上下文联系很紧密。

## 总结
Vue.js 2.x 中，框架背后帮我们做了很多事情，比如我们在 data 中定义的变量，在组件实例化阶段会把它们变成响应式的，这个行为是黑盒的，用户是无感知的。反观 Vue.js 3.0 Composition API，用户会利用 reactive 或者 ref API 主动去申明一个响应式对象。

所以**通过 Composition API 去编写组件，用户更清楚自己在做什么事情**。

> 思考：如果你想利用依赖注入让整个应用下组件都能共享某个数据，你会怎么做？




