import {
  DEFAULT_INTERPOLATION_CONFIG,
  HtmlParser,
  InterpolationConfig,
  makeBindingParser,
} from '@angular/compiler';

import {
  htmlAstToRender3Ast,
  Render3ParseResult,
} from '@angular/compiler/src/render3/r3_template_transform';
import { TemplateTransformBase } from '../template-transform-strategy/transform.base';
import { GlobalContext } from './node-handle/global-context';
import {
  NgBoundTextMeta,
  NgElementMeta,
  NgNodeMeta,
  NgTemplateMeta,
} from './node-handle/interface';
import { generateParsedNode } from './node-handle/node-handle';
import {
  isNgBoundTextMeta,
  isNgElementMeta,
  isNgTemplateMeta,
} from './node-handle/node-meta/type-predicate';
export class TemplateCompiler {
  private render3ParseResult!: Render3ParseResult;
  private ngNodeMetaList: NgNodeMeta[] = [];
  globalContext = new GlobalContext();
  constructor(
    private url: string,
    private content: string,
    private templateTransform: TemplateTransformBase,
    private options: { interpolation?: string[] } = {}
  ) {
    this.templateTransform.setGlobalContext(this.globalContext);
  }
  private parseHtmlToAst() {
    let parser = new HtmlParser();
    let interpolation: InterpolationConfig = DEFAULT_INTERPOLATION_CONFIG;
    if (this.options.interpolation) {
      interpolation = new InterpolationConfig(
        this.options.interpolation[0],
        this.options.interpolation[1]
      );
    }
    let parseTreeResult = parser.parse(this.content, this.url, {
      interpolationConfig: interpolation,
    });
    let bindingParser = makeBindingParser(interpolation);
    this.render3ParseResult = htmlAstToRender3Ast(
      parseTreeResult.rootNodes,
      bindingParser,
      {
        collectCommentNodes: true,
      }
    );
  }
  private buildPlatformTemplate() {
    this.parseNode();
    return this.templateTransform.compile(this.ngNodeMetaList);
  }
  private parseNode() {
    let nodes = this.render3ParseResult.nodes;

    for (let i = 0; i < nodes.length; i++) {
      const node = nodes[i];
      let parsedNode = generateParsedNode(node, undefined, this.globalContext);
      this.ngNodeMetaList.push(parsedNode.getNodeMeta(this.globalContext));
    }
  }

  transform() {
    this.parseHtmlToAst();
    let content = this.buildPlatformTemplate();
    let template = this.templateTransform.getExportTemplate();
    let context = this.ngNodeMetaList
      .filter(
        (item) =>
          isNgElementMeta(item) ||
          isNgTemplateMeta(item) ||
          isNgBoundTextMeta(item)
      )
      .map(
        (item) =>
          (item as NgElementMeta | NgTemplateMeta | NgBoundTextMeta).data
      )
      .reduce((pre, cur) => {
        pre.push(...cur);
        return pre;
      }, []);
    return {
      content: content,
      template: template,
      context: Array.from(new Set(context)),
    };
  }
}
