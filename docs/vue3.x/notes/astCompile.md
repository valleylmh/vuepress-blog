# 模板解析：构造 AST 的完整流程是怎样的？

在了解编译过程以及背后的优化思想内容的过程中，你可以使用官方的一个[模板导出工具](https://vue-next-template-explorer.netlify.app/)，在线调试模板的实时编译结果，辅助学习。如果你想在线调试编译的过程，可以在 vue-next 的源码 packages/template-explorer/dist/template-explorer.global.js 中的关键流程上打debugger 断点，然后在根目录下运行 npm run dev-compiler 命令，接着访问 [http://localhost:5000/packages/template-explorer](http://localhost:5000/packages/template-explorer)调试即可。

Vue.js 3.0 的编译场景分服务端 SSR 编译和 web 编译，我们只分析 web 的编译。
先来看 web 编译的入口 compile 函数，分析它的实现原理：
```js
function compile(template, options = {}) { 
  return baseCompile(template, extend({}, parserOptions, options, { 
    nodeTransforms: [...DOMNodeTransforms, ...(options.nodeTransforms || [])], 
    directiveTransforms: extend({}, DOMDirectiveTransforms, options.directiveTransforms || {}), 
    transformHoist:  null 
  })) 
} 
```
compile 内部通过执行 baseCompile 方法完成编译工作，可以看到 baseCompile 在参数 options 的基础上又扩展了一些配置。对于这些编译相关的配置，我们后面会在具体的场景具体分析。
接下来，我们来看一下 baseCompile 的实现：
```js
function baseCompile(template,  options = {}) { 
  const prefixIdentifiers = false 
  // 解析 template 生成 AST 
  const ast = isString(template) ? baseParse(template, options) : template 
  const [nodeTransforms, directiveTransforms] = getBaseTransformPreset() 
  // AST 转换 
  transform(ast, extend({}, options, { 
    prefixIdentifiers, 
    nodeTransforms: [ 
      ...nodeTransforms, 
      ...(options.nodeTransforms || []) 
    ], 
    directiveTransforms: extend({}, directiveTransforms, options.directiveTransforms || {} 
    ) 
  })) 
  // 生成代码 
  return generate(ast, extend({}, options, { 
    prefixIdentifiers 
  })) 
} 
```
可以看到，baseCompile 函数主要做三件事情：**解析 template 生成 AST，AST 转换和生成代码**。

### 生成 AST 抽象语法树

你可以在百度百科中看到 [AST 的定义](https://baike.baidu.com/item/%E6%8A%BD%E8%B1%A1%E8%AF%AD%E6%B3%95%E6%A0%91/6129952?fr=aladdin)，对应到我们的 template，也可以用 AST 去描述它，比如我们有如下 template：
```vue
<div class="app"> 
  <!-- 这是一段注释 --> 
  <hello> 
    <p>{{ msg }}</p> 
  </hello> 
  <p>This is an app</p> 
</div> 
```
通过在线[astexplorer](https://astexplorer.net/)可以查看相应的语法树。

![](https://upload-images.jianshu.io/upload_images/3061147-f40b2d7e61149ffc.png?imageMogr2/auto-orient/strip%7CimageView2/2/w/1240)

AST 是树状结构，对于树中的每个节点，会有 type 字段描述节点的类型，tag 字段描述节点的标签，props 描述节点的属性，loc 描述节点对应代码相关信息，children 指向它的子节点对象数组。

> AST 中的节点是可以完整地描述它在模板中映射的节点信息。

你已经大致了解了 AST，那么接下来我们看一下如何根据模板字符串来构建这个 AST 对象吧。
先来看一下 baseParse 的实现：
```js
function baseParse(content, options = {}) { 
    // 创建解析上下文 
    const context = createPa  rserContext(content, options) 
    const start = getCursor(context) 
    // 解析子节点，并创建 AST  
    return createRoot(parseChildren(context, 0 /* DATA */, []), getSelection(context, start)) 
} 
```
## 创建解析上下文
首先，我们来分析创建解析上下文的过程，先来看 createParserContext 的实现：
```js
// 默认解析配置 
const defaultParserOptions = { 
  delimiters: [`{{`, `}}`], 
  getNamespace: () => 0 /* HTML */, 
  getTextMode: () => 0 /* DATA */, 
  isVoidTag: NO, 
  isPreTag: NO, 
  isCustomElement: NO, 
  decodeEntities: (rawText) => rawText.replace(decodeRE, (_, p1) => decodeMap[p1]), 
  onError: defaultOnError 
} 
function createParserContext(content, options) { 
  return { 
    options: extend({}, defaultParserOptions, options), 
    column: 1, 
    line: 1, 
    offset: 0, 
    originalSource: content, 
    source: content, 
    inPre: false, 
    inVPre: false 
  } 
}
```
解析上下文实际上就是一个 JavaScript 对象，它维护着解析过程中的上下文，其中 options 表示解析相关配置 ，column 表示当前代码的列号，line 表示当前代码的行号，originalSource 表示最初的原始代码，source 表示当前代码，offset 表示当前代码相对于原始代码的偏移量，inPre 表示当前代码是否在 pre 标签内，inVPre 表示当前代码是否在 v-pre 指令的环境下。

在后续解析的过程中，会始终维护和更新这个解析上下文，它能够表示当前解析的状态。
创建完解析上下文，接下来就开始解析子节点了。
## 解析子节点
我们先来看一下 parseChildren 函数的实现：
```js
function parseChildren(context, mode, ancestors) { 
  const parent = last(ancestors) 
  const ns = parent ? parent.ns : 0 /* HTML */ 
  const nodes = [] 
  // 自顶向下分析代码，生成 nodes 
  let removedWhitespace = false 
  // 空白字符管理 
  return removedWhitespace ? nodes.filter(Boolean) : nodes 
} 
```
parseChildren 的目的就是解析并创建 AST 节点数组。它有两个主要流程，第一个是自顶向下分析代码，生成 AST 节点数组 nodes；第二个是空白字符管理，用于提高编译的效率。
首先，我们来看生成 AST 节点数组的流程：
```js
function parseChildren(context, mode, ancestors) { 
  // 父节点 
  const parent = last(ancestors) 
  const ns = parent ? parent.ns : 0 /* HTML */ 
  const nodes = [] 
  // 判断是否遍历结束 
  while (!isEnd(context, mode, ancestors)) { 
    const s = context.source 
    let node = undefined 
    if (mode === 0 /* DATA */ || mode === 1 /* RCDATA */) { 
      if (!context.inVPre && startsWith(s, context.options.delimiters[0])) { 
        // 处理 {{ 插值代码 
        node = parseInterpolation(context, mode) 
      } 
      else if (mode === 0 /* DATA */ && s[0] === '<') { 
        // 处理 < 开头的代码 
        if (s.length === 1) { 
          // s 长度为 1，说明代码结尾是 <，报错 
          emitError(context, 5 /* EOF_BEFORE_TAG_NAME */, 1) 
        } 
        else if (s[1] === '!') { 
          // 处理 <! 开头的代码 
          if (startsWith(s, '<!--')) { 
            // 处理注释节点 
            node = parseComment(context) 
          } 
          else if (startsWith(s, '<!DOCTYPE')) { 
            // 处理 <!DOCTYPE 节点 
            node = parseBogusComment(context) 
          } 
          else if (startsWith(s, '<![CDATA[')) { 
            // 处理 <![CDATA[ 节点 
            if (ns !== 0 /* HTML */) { 
              node = parseCDATA(context, ancestors) 
            } 
            else { 
              emitError(context, 1 /* CDATA_IN_HTML_CONTENT */) 
              node = parseBogusComment(context) 
            } 
          } 
          else { 
            emitError(context, 11 /* INCORRECTLY_OPENED_COMMENT */) 
            node = parseBogusComment(context) 
          } 
        } 
        else if (s[1] === '/') { 
          // 处理 </ 结束标签 
          if (s.length === 2) { 
            // s 长度为 2，说明代码结尾是 </，报错 
            emitError(context, 5 /* EOF_BEFORE_TAG_NAME */, 2) 
          } 
          else if (s[2] === '>') { 
            // </> 缺少结束标签，报错 
            emitError(context, 14 /* MISSING_END_TAG_NAME */, 2) 
            advanceBy(context, 3) 
            continue 
          } 
          else if (/[a-z]/i.test(s[2])) { 
            // 多余的结束标签 
            emitError(context, 23 /* X_INVALID_END_TAG */) 
            parseTag(context, 1 /* End */, parent) 
            continue 
          } 
          else { 
            emitError(context, 12 /* INVALID_FIRST_CHARACTER_OF_TAG_NAME */, 2) 
            node = parseBogusComment(context) 
          } 
        } 
        else if (/[a-z]/i.test(s[1])) { 
          // 解析标签元素节点 
          node = parseElement(context, ancestors) 
        } 
        else if (s[1] === '?') { 
          emitError(context, 21 /* UNEXPECTED_QUESTION_MARK_INSTEAD_OF_TAG_NAME */, 1) 
          node = parseBogusComment(context) 
        } 
        else { 
          emitError(context, 12 /* INVALID_FIRST_CHARACTER_OF_TAG_NAME */, 1) 
        } 
      } 
    } 
    if (!node) { 
      // 解析普通文本节点 
      node = parseText(context, mode) 
    } 
    if (isArray(node)) { 
      // 如果 node 是数组，则遍历添加 
      for (let i = 0; i < node.length; i++) { 
        pushNode(nodes, node[i]) 
      } 
    } 
    else { 
      // 添加单个 node 
      pushNode(nodes, node) 
    } 
  } 
}
```
这些代码看起来很复杂，但它的思路就是自顶向下地去遍历代码，然后根据不同的情况尝试去解析代码，然后把生成的 node 添加到 AST nodes 数组中。在解析的过程中，解析上下文 context 的状态也是在不断发生变化的，我们可以通过 context.source 拿到当前解析剩余的代码 s，然后根据 s 不同的情况走不同的分支处理逻辑。在解析的过程中，可能会遇到各种错误，都会通过 emitError 方法报错。

我们没有必要去了解所有代码的分支细节，只需要知道大致的解析思路即可，因此我们这里只分析四种情况：注释节点的解析、插值的解析、普通文本的解析，以及元素节点的解析。

- 注释节点的解析
首先，我们来看注释节点的解析过程，它会解析模板中的注释节点，比如 `<!-这是一段注释-->`， 即当前代码 s 是以 `<!- `开头的字符串，则走到注释节点的解析处理逻辑。

```js
function parseComment(context) { 
  const start = getCursor(context) 
  let content 
  // 常规注释的结束符 
  const match = /--(\!)?>/.exec(context.source) 
  if (!match) { 
    // 没有匹配的注释结束符 
    content = context.source.slice(4) 
    advanceBy(context, context.source.length) 
    emitError(context, 7 /* EOF_IN_COMMENT */) 
  } 
  else { 
    if (match.index <= 3) { 
      // 非法的注释符号 
      emitError(context, 0 /* ABRUPT_CLOSING_OF_EMPTY_COMMENT */) 
    } 
    if (match[1]) { 
      // 注释结束符不正确 
      emitError(context, 10 /* INCORRECTLY_CLOSED_COMMENT */) 
    } 
    // 获取注释的内容 
    content = context.source.slice(4, match.index) 
    // 截取到注释结尾之间的代码，用于后续判断嵌套注释 
    const s = context.source.slice(0, match.index) 
    let prevIndex = 1, nestedIndex = 0 
    // 判断嵌套注释符的情况，存在即报错 
    while ((nestedIndex = s.indexOf('<!--', prevIndex)) !== -1) { 
      advanceBy(context, nestedIndex - prevIndex + 1) 
      if (nestedIndex + 4 < s.length) { 
        emitError(context, 16 /* NESTED_COMMENT */) 
      } 
      prevIndex = nestedIndex + 1 
    } 
    // 前进代码到注释结束符后 
    advanceBy(context, match.index + match[0].length - prevIndex + 1) 
  } 
  return { 
    type: 3 /* COMMENT */, 
    content, 
    loc: getSelection(context, start) 
  } 
} 
```
其实，parseComment 的实现很简单，首先它会利用注释结束符的正则表达式去匹配代码，找出注释结束符。如果没有匹配到或者注释结束符不合法，都会报错。
如果找到合法的注释结束符，则获取它中间的注释内容 content，然后截取注释开头到结尾之间的代码，并判断是否有嵌套注释，如果有嵌套注释也会报错。

接着就是通过调用 advanceBy 前进代码到注释结束符后，这个函数在整个模板解析过程中经常被调用，它的目的是用来前进代码，更新 context 解析上下文，我们来看一下它的实现：
```js
function advanceBy(context, numberOfCharacters) { 
  const { source } = context 
  // 更新 context 的 offset、line、column 
  advancePositionWithMutation(context, source, numberOfCharacters) 
  // 更新 context 的 source 
  context.source = source.slice(numberOfCharacters) 
} 
function advancePositionWithMutation(pos, source, numberOfCharacters = source.length) { 
  let linesCount = 0 
  let lastNewLinePos = -1 
  for (let i = 0; i < numberOfCharacters; i++) { 
    if (source.charCodeAt(i) === 10 /* newline char code */) { 
      linesCount++ 
      lastNewLinePos = i 
    } 
  } 
  pos.offset += numberOfCharacters 
  pos.line += linesCount 
  pos.column = 
    lastNewLinePos === -1 
      ? pos.column + numberOfCharacters 
      : numberOfCharacters - lastNewLinePos 
  return pos 
} 
```
advanceBy 的实现很简单，主要就是更新解析上下文 context 中的 source 来前进代码，同时更新 offset、line、column 等和代码位置相关的属性。

为了更直观地说明 advanceBy 的作用，前面的示例可以通过下图表示：

![](https://upload-images.jianshu.io/upload_images/3061147-e64236f06f76c168.png?imageMogr2/auto-orient/strip%7CimageView2/2/w/1240)

经过 advanceBy 前进代码到注释结束符后，表示注释部分代码处理完毕，可以继续解析后续代码了。

parseComment 最终返回的值就是一个描述注释节点的对象，其中 type 表示它是一个注释节点，content 表示注释的内容，loc 表示注释的代码开头和结束的位置信息。

- 插值的解析
接下来，我们来看插值的解析过程，它会解析模板中的插值，比如 {{ msg }} ，即当前代码 s 是以 {{ 开头的字符串，且不在 v-pre 指令的环境下（v-pre 会跳过插值的解析），则会走到插值的解析处理逻辑 parseInterpolation 函数，我们来看它的实现：
```js
function parseInterpolation(context, mode) { 
  // 从配置中获取插值开始和结束分隔符，默认是 {{ 和 }} 
  const [open, close] = context.options.delimiters 
  const closeIndex = context.source.indexOf(close, open.length) 
  if (closeIndex === -1) { 
    emitError(context, 25 /* X_MISSING_INTERPOLATION_END */) 
    return undefined 
  } 
  const start = getCursor(context) 
  // 代码前进到插值开始分隔符后 
  advanceBy(context, open.length) 
  // 内部插值开始位置 
  const innerStart = getCursor(context) 
  // 内部插值结束位置 
  const innerEnd = getCursor(context) 
  // 插值原始内容的长度 
  const rawContentLength = closeIndex - open.length 
  // 插值原始内容 
  const rawContent = context.source.slice(0, rawContentLength) 
  // 获取插值的内容，并前进代码到插值的内容后 
  const preTrimContent = parseTextData(context, rawContentLength, mode) 
  const content = preTrimContent.trim() 
  // 内容相对于插值开始分隔符的头偏移 
  const startOffset = preTrimContent.indexOf(content) 
  if (startOffset > 0) { 
    // 更新内部插值开始位置 
    advancePositionWithMutation(innerStart, rawContent, startOffset) 
  } 
  // 内容相对于插值结束分隔符的尾偏移 
  const endOffset = rawContentLength - (preTrimContent.length - content.length - startOffset) 
  // 更新内部插值结束位置 
  advancePositionWithMutation(innerEnd, rawContent, endOffset); 
  // 前进代码到插值结束分隔符后 
  advanceBy(context, close.length) 
  return { 
    type: 5 /* INTERPOLATION */, 
    content: { 
      type: 4 /* SIMPLE_EXPRESSION */, 
      isStatic: false, 
      isConstant: false, 
      content, 
      loc: getSelection(context, innerStart, innerEnd) 
    }, 
    loc: getSelection(context, start) 
  } 
} 
```
parseInterpolation 的实现也很简单，首先它会尝试找插值的结束分隔符，如果找不到则报错。

如果找到，先前进代码到插值开始分隔符后，然后通过 parseTextData 获取插值中间的内容并前进代码到插值内容后，除了普通字符串，parseTextData 内部会处理一些 HTML 实体符号比如 &nbsp 。由于插值的内容可能是前后有空白字符的，所以最终返回的 content 需要执行一下 trim 函数。

为了准确地反馈插值内容的代码位置信息，我们使用了 innerStart 和 innerEnd 去记录插值内容（不包含空白字符）的代码开头和结束位置。
接着就是前进代码到插值结束分隔符后，表示插值部分代码处理完毕，可以继续解析后续代码了。

parseInterpolation 最终返回的值就是一个描述插值节点的对象，其中 type 表示它是一个插值节点，loc 表示插值的代码开头和结束的位置信息，而 content 又是一个描述表达式节点的对象，其中 type 表示它是一个表达式节点，loc 表示内容的代码开头和结束的位置信息，content 表示插值的内容。

- 普通文本的解析
接下来，我们来看普通文本的解析过程，它会解析模板中的普通文本，比如 This is an app ，即当前代码 s 既不是以 {{ 插值分隔符开头的字符串，也不是以 < 开头的字符串，则走到普通文本的解析处理逻辑，我们来看 parseText 的实现：
```js
function parseText(context, mode) { 
  // 文本结束符 
  const endTokens = ['<', context.options.delimiters[0]] 
  if (mode === 3 /* CDATA */) { 
    // CDATA 标记 XML 中的纯文本 
    endTokens.push(']]>') 
  } 
  let endIndex = context.source.length 
  // 遍历文本结束符，匹配找到结束的位置 
  for (let i = 0; i < endTokens.length; i++) { 
    const index = context.source.indexOf(endTokens[i], 1) 
    if (index !== -1 && endIndex > index) { 
      endIndex = index 
    } 
  } 
  const start = getCursor(context) 
  // 获取文本的内容，并前进代码到文本的内容后 
  const content = parseTextData(context, endIndex, mode) 
  return { 
    type: 2 /* TEXT */, 
    content, 
    loc: getSelection(context, start) 
  } 
}
```
同样，parseText 的实现很简单。对于一段文本来说，都是在遇到 < 或者插值分隔符 {{ 结束，所以会遍历这些结束符，匹配并找到文本结束的位置，然后执行 parseTextData 获取文本的内容，并前进代码到文本的内容后。

parseText 最终返回的值就是一个描述文本节点的对象，其中 type 表示它是一个文本节点，content 表示文本的内容，loc 表示文本的代码开头和结束的位置信息。

- 元素节点的解析
最后，我们来看元素节点的解析过程，它会解析模板中的标签节点，举个例子：
```vue
<div class="app">
  <hello :msg="msg"></hello>
</div>
```
相对于前面三种类型的解析过程，元素节点的解析过程应该是最复杂的了，即当前代码 s 是以 < 开头，并且后面跟着字母，说明它是一个标签的开头，则走到元素节点的解析处理逻辑，我们来看 parseElement 的实现：
```js
function parseElement(context, ancestors) {
  // 是否在 pre 标签内
  const wasInPre = context.inPre
  // 是否在 v-pre 指令内
  const wasInVPre = context.inVPre
  // 获取当前元素的父标签节点
  const parent = last(ancestors)
  // 解析开始标签，生成一个标签节点，并前进代码到开始标签后
  const element = parseTag(context, 0 /* Start */, parent)
  // 是否在 pre 标签的边界
  const isPreBoundary = context.inPre && !wasInPre
  // 是否在 v-pre 指令的边界
  const isVPreBoundary = context.inVPre && !wasInVPre
  if (element.isSelfClosing || context.options.isVoidTag(element.tag)) {
    // 如果是自闭和标签，直接返回标签节点
    return element
  }
  // 下面是处理子节点的逻辑
  // 先把标签节点添加到 ancestors，入栈
  ancestors.push(element)
  const mode = context.options.getTextMode(element, parent)
  // 递归解析子节点，传入 ancestors
  const children = parseChildren(context, mode, ancestors)
  // ancestors 出栈
  ancestors.pop()
  // 添加到 children 属性中
  element.children = children
  // 结束标签
  if (startsWithEndTagOpen(context.source, element.tag)) {
    // 解析结束标签，并前进代码到结束标签后
    parseTag(context, 1 /* End */, parent)
  }
  else {
    emitError(context, 24 /* X_MISSING_END_TAG */, 0, element.loc.start);
    if (context.source.length === 0 && element.tag.toLowerCase() === 'script') {
      const first = children[0];
      if (first && startsWith(first.loc.source, '<!--')) {
        emitError(context, 8 /* EOF_IN_SCRIPT_HTML_COMMENT_LIKE_TEXT */)
      }
    }
  }
  // 更新标签节点的代码位置，结束位置到结束标签后
  element.loc = getSelection(context, element.loc.start)
  if (isPreBoundary) {
    context.inPre = false
  }
  if (isVPreBoundary) {
    context.inVPre = false
  }
  return element
}
```
可以看到，这个过程中 parseElement 主要做了三件事情：*解析开始标签，解析子节点，解析闭合标签*。
首先，我们来看解析开始标签的过程。主要通过 parseTag 方法来解析并创建一个标签节点，来看它的实现原理：
```js
function parseTag(context, type, parent) {
  // 标签打开
  const start = getCursor(context)
  // 匹配标签文本结束的位置
  const match = /^<\/?([a-z][^\t\r\n\f />]*)/i.exec(context.source);
  const tag = match[1];
  const ns = context.options.getNamespace(tag, parent);
  // 前进代码到标签文本结束位置
  advanceBy(context, match[0].length);
  // 前进代码到标签文本后面的空白字符后
  advanceSpaces(context);
  // 保存当前状态以防我们需要用 v-pre 重新解析属性
  const cursor = getCursor(context);
  const currentSource = context.source;
  // 解析标签中的属性，并前进代码到属性后
  let props = parseAttributes(context, type);
  // 检查是不是一个 pre 标签
  if (context.options.isPreTag(tag)) {
    context.inPre = true;
  }
  // 检查属性中有没有 v-pre 指令
  if (!context.inVPre &&
    props.some(p => p.type === 7 /* DIRECTIVE */ && p.name === 'pre')) {
    context.inVPre = true;
    // 重置 context
    extend(context, cursor);
    context.source = currentSource;
    // 重新解析属性，并把 v-pre 过滤了
    props = parseAttributes(context, type).filter(p => p.name !== 'v-pre');
  }
  // 标签闭合
  let isSelfClosing = false;
  if (context.source.length === 0) {
    emitError(context, 9 /* EOF_IN_TAG */);
  }
  else {
    // 判断是否自闭合标签
    isSelfClosing = startsWith(context.source, '/>');
    if (type === 1 /* End */ && isSelfClosing) {
      // 结束标签不应该是自闭和标签
      emitError(context, 4 /* END_TAG_WITH_TRAILING_SOLIDUS */);
    }
    // 前进代码到闭合标签后
    advanceBy(context, isSelfClosing ? 2 : 1);
  }
  let tagType = 0 /* ELEMENT */;
  const options = context.options;
  // 接下来判断标签类型，是组件、插槽还是模板
  if (!context.inVPre && !options.isCustomElement(tag)) {
    // 判断是否有 is 属性
    const hasVIs = props.some(p => p.type === 7 /* DIRECTIVE */ && p.name === 'is');
    if (options.isNativeTag && !hasVIs) {
      if (!options.isNativeTag(tag))
        tagType = 1 /* COMPONENT */;
    }
    else if (hasVIs ||
      isCoreComponent(tag) ||
      (options.isBuiltInComponent && options.isBuiltInComponent(tag)) ||
      /^[A-Z]/.test(tag) ||
      tag === 'component') {
      tagType = 1 /* COMPONENT */;
    }
    if (tag === 'slot') {
      tagType = 2 /* SLOT */;
    }
    else if (tag === 'template' &&
      props.some(p => {
        return (p.type === 7 /* DIRECTIVE */ && isSpecialTemplateDirective(p.name));
      })) {
      tagType = 3 /* TEMPLATE */;
    }
  }
  return {
    type: 1 /* ELEMENT */,
    ns,
    tag,
    tagType,
    props,
    isSelfClosing,
    children: [],
    loc: getSelection(context, start),
    codegenNode: undefined
  };
}
```
parseTag 首先匹配标签文本结束的位置，并前进代码到标签文本后面的空白字符后，然后解析标签中的属性，比如 class、style 和指令等，parseAttributes 函数的实现我就不多说了，感兴趣的同学可以自己去看，它最终会解析生成一个 props 的数组，并前进代码到属性后。

接着去检查是不是一个 pre 标签，如果是则设置 context.inPre 为 true；再去检查属性中有没有 v-pre 指令，如果有则设置 context.inVPre 为 true，并重置上下文 context 和重新解析属性；接下来再去判断是不是一个自闭和标签，并前进代码到闭合标签后；最后判断标签类型，是组件、插槽还是模板。

parseTag 最终返回的值就是一个描述标签节点的对象，其中 type 表示它是一个标签节点，tag 表示标签名，tagType 表示标签的类型，content 表示文本的内容，isSelfClosing 表示是否是一个闭合标签，loc 表示文本的代码开头和结束的位置信息，children 是标签的子节点数组，会先初始化为空。

解析完开始标签后，再回到 parseElement，接下来第二步就是解析子节点，它把解析好的 element 节点添加到 ancestors 数组中，然后执行 parseChildren 去解析子节点，并传入 ancestors。

如果有嵌套的标签，那么就会递归执行 parseElement，可以看到，在 parseElement 的一开始，我们能获取 ancestors 数组的最后一个值拿到父元素的标签节点，这个就是我们在执行 parseChildren 前添加到数组尾部的。

解析完子节点后，我们再把 element 从 ancestors 中弹出，然后把 children 数组添加到 element.children 中，同时也把代码前进到子节点的末尾。

最后，就是解析结束标签，并前进代码到结束标签后，然后更新标签节点的代码位置。parseElement 最终返回的值就是这样一个标签节点 element。

其实 HTML 的嵌套结构的解析过程，就是一个递归解析元素节点的过程，为了维护父子关系，当需要解析子节点时，我们就把当前节点入栈，子节点解析完毕后，我们就把当前节点出栈，因此 ancestors 的设计就是一个栈的数据结构，整个过程是一个不断入栈和出栈的过程。

通过不断地递归解析，我们就可以完整地解析整个模板，并且标签类型的 AST 节点会保持对子节点数组的引用，这样就构成了一个树形的数据结构，所以整个解析过程构造出的 AST 节点数组就能很好地映射整个模板的 DOM 结构。

## 空白字符管理
在前面的解析过程中，有些时候我们会遇到空白字符的情况，比如前面的例子：
```vue
<div class="app">
  <hello :msg="msg"></hello>
</div>
```
div 标签到下一行会有一个换行符，hello 标签前面也有空白字符，这些空白字符在解析的过程中会被当作文本节点解析处理。但这些空白节点显然是没有什么意义的，所以我们需要移除这些节点，减少后续对这些没用意义的节点的处理，以提高编译效率。
我们先来看一下空白字符管理相关逻辑代码：
```js
function parseChildren(context, mode, ancestors) {
  const parent = last(ancestors)
  const ns = parent ? parent.ns : 0 /* HTML */
  const nodes = []
  // 自顶向下分析代码，生成 nodes
  let removedWhitespace = false
  if (mode !== 2 /* RAWTEXT */) {
    if (!context.inPre) {
      for (let i = 0; i < nodes.length; i++) {
        const node = nodes[i]
        if (node.type === 2 /* TEXT */) {
          if (!/[^\t\r\n\f ]/.test(node.content)) {
            // 匹配空白字符
            const prev = nodes[i - 1]
            const next = nodes[i + 1] 
            // 如果空白字符是开头或者结尾节点
            // 或者空白字符与注释节点相连
            // 或者空白字符在两个元素之间并包含换行符
            // 那么这些空白字符节点都应该被移除
            if (!prev ||
              !next ||
              prev.type === 3 /* COMMENT */ ||
              next.type === 3 /* COMMENT */ ||
              (prev.type === 1 /* ELEMENT */ &&
                next.type === 1 /* ELEMENT */ &&
                /[\r\n]/.test(node.content))) {
              removedWhitespace = true
              nodes[i] = null
            }
            else {
              // 否则压缩这些空白字符到一个空格
              node.content = ' '
            }
          }
          else {
            // 替换内容中的空白空间到一个空格
            node.content = node.content.replace(/[\t\r\n\f ]+/g, ' ')
          }
        }
        else if (!(process.env.NODE_ENV !== 'production') && node.type === 3 /* COMMENT */) {
          // 生产环境移除注释节点
          removedWhitespace = true
          nodes[i] = null
        }
      }
    }
    else if (parent && context.options.isPreTag(parent.tag)) {
      // 根据 HTML 规范删除前导换行符
      const first = nodes[0]
      if (first && first.type === 2 /* TEXT */) {
        first.content = first.content.replace(/^\r?\n/, '')
      }
    }
  }
  // 过滤空白字符节点
  return removedWhitespace ? nodes.filter(Boolean) : nodes
}
```
这段代码逻辑很简单，主要就是遍历 nodes，拿到每一个 AST 节点，判断是否为一个文本节点，如果是则判断它是不是空白字符；如果是则进一步判断空白字符是开头或还是结尾节点，或者空白字符与注释节点相连，或者空白字符在两个元素之间并包含换行符，如果满足上述这些情况，这些空白字符节点都应该被移除。
此外，不满足这三种情况的空白字符都会被压缩成一个空格，非空文本中间的空白字符也会被压缩成一个空格，在生产环境下注释节点也会被移除。
在 parseChildren 函数的最后，会过滤掉这些被标记清除的节点并返回过滤后的 AST 节点数组。

## 创建 AST 根节点
子节点解析完毕，baseParse 过程就剩最后一步创建 AST 根节点了，我们来看一下 createRoot 的实现：
```js
function createRoot(children, loc = locStub) {
  return {
    type: 0 /* ROOT */,
    children,
    helpers: [],
    components: [],
    directives: [],
    hoists: [],
    imports: [],
    cached: 0,
    temps: 0,
    codegenNode: undefined,
    loc
  }
}
```
createRoot 的实现非常简单，它就是返回一个 JavaScript 对象，作为 AST 根节点。其中 type 表示它是一个根节点类型，children 是我们前面解析的子节点数组。除此之外，这个根节点还添加了其它的属性，当前我们并不需要搞清楚每一个属性代表的含义，这些属性我们在分析后续的处理流程中会介绍。

## 总结
好的，到这里我们这一节的学习也要结束啦，通过这节课的学习，你应该掌握 Vue.js 编译过程的第一步，即把 **template 解析生成 AST 对象**，整个解析过程是一个自顶向下的分析过程，也就是从代码开始，通过语法分析，找到对应的解析处理逻辑，创建 AST 节点，处理的过程中也在不断前进代码，更新解析上下文，最终根据生成的 AST 节点数组创建 AST 根节点。

> 思考：在 parseTag 的过程中，如果解析的属性有 v-pre 标签，为什么要回到之前的 context，重新解析一次？

