# Vue源码框架学习
**一、new Vue到底发生了什么**
![](http://ww1.sinaimg.cn/large/826a8060ly1glv7q0ze2aj20kc09rdg2.jpg)

**二、Vue2.x响应式原理图**

思考响应式原理以下的问题：

>- 我需要修改哪块的 DOM？
>- 我的修改效率和性能是不是最优的？
>- 我需要对数据每一次的修改都去操作 DOM 吗？
>- 我需要 case by case 去写修改 DOM 的逻辑吗？

![Vue2.x响应式原理图](http://ww1.sinaimg.cn/large/826a8060ly1glv7m0jlpaj21gq0zi0xe.jpg)

[Vue2.x版本](/vue2.x/prepare)