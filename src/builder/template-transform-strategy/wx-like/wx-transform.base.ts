import { VIEW_TEMPLATE_OBJECT } from '../../html/const';
import {
  NgBoundTextMeta,
  NgContentMeta,
  NgElementMeta,
  NgNodeMeta,
  NgTemplateMeta,
  NgTextMeta,
} from '../../html/node-handle/interface';
import {
  isNgBoundTextMeta,
  isNgConetentMeta,
  isNgElementMeta,
  isNgTemplateMeta,
  isNgTextMeta,
} from '../../html/node-handle/node-meta/type-predicate';
import { BindValue, PlainValue } from '../../html/node-handle/value';
import { TemplateTransformBase } from '../transform.base';

export abstract class WxTransformLike extends TemplateTransformBase {
  abstract directivePrefix: string;
  abstract viewContextName: string;
  private exportTemplateList: { name: string; content: string }[] = [];
  constructor() {
    super();
  }
  private _compileTemplate(node: NgNodeMeta): string {
    if (isNgElementMeta(node)) {
      return this.ngElementTransform(node);
    } else if (isNgBoundTextMeta(node)) {
      return this.ngBoundTextTransform(node);
    } else if (isNgTextMeta(node)) {
      return this.ngTextTransform(node);
    } else if (isNgConetentMeta(node)) {
      return this.ngConetentTransform(node);
    } else if (isNgTemplateMeta(node)) {
      return this.ngTemplateTransform(node);
    } else {
      throw new Error('未知的ng节点元数据');
    }
  }
  compileTemplate(node: NgNodeMeta) {
    return this._compileTemplate(node);
  }
  compile(nodes: NgNodeMeta[]) {
    const result = nodes
      .map((ngModeMeta) => this.compileTemplate(ngModeMeta))
      .join('');
    const templateImport = this.exportTemplateList.length
      ? `<import src="./template.wxml"/>`
      : '';
    return `${templateImport}<template name="main-template">${result}</template><template is="main-template" data="{{...${this.viewContextName}}}"></template>`;
  }
  private ngElementTransform(node: NgElementMeta): string {
    const children = node.children.map((child) => this._compileTemplate(child));
    const attributeStr = Object.entries(node.attributes)
      .map(([key, value]) => `${key}="${value}"`)
      .join(' ');
    const inputStr = Object.entries(node.inputs)
      .map(([key, value]) => `${key}="{{${value}}}"`)
      .join(' ');
    const outputStr = node.outputs
      .map(
        (item) => `${item.name}="${item.handler.source!.replace(/\(.*$/, '')}"`
      )
      .join(' ');
    if (node.singleClosedTag) {
      return `<${node.tagName} ${attributeStr} ${inputStr} ${outputStr}>`;
    }
    return `<${
      node.tagName
    } ${attributeStr} ${inputStr} ${outputStr}>${children.join('')}</${
      node.tagName
    }>`;
  }
  private ngBoundTextTransform(node: NgBoundTextMeta): string {
    return node.values.map((item) => this.insertValue(item)).join('');
  }
  private ngConetentTransform(node: NgContentMeta): string {
    return node.name ? `<slot name="${node.name}"></slot>` : `<slot></slot>`;
  }
  private ngTemplateTransform(node: NgTemplateMeta): string {
    const children = node.children.map((child) => this._compileTemplate(child));
    let content = '';
    const directiveList = node.directive;
    for (let i = 0; i < directiveList.length; i++) {
      const directive = directiveList[i];
      if (directive.type === 'none') {
        this.exportTemplateList.push({
          name: directive.name[0].name,
          content: `<template name="${directive.name[0].name}">${children.join(
            ''
          )}</template>`,
        });
      } else if (directive.type === 'if') {
        if (directive.thenTemplateRef) {
          content += `<block ${this.directivePrefix}:if="${this.insertValue(
            directive.assert
          )}"><template is="${
            directive.thenTemplateRef.value
          }" data="{{...${VIEW_TEMPLATE_OBJECT}.${
            directive.trueVariable
          }}}"></template></block>`;
        } else {
          throw new Error('这里应该被废弃');
        }
        if (directive.falseTemplateRef) {
          content += `<block  ${this.directivePrefix}:else><template is="${directive.falseTemplateRef}" data="{{...${VIEW_TEMPLATE_OBJECT}.${directive.falseVariable}}}"></template></block>`;
        }
      } else if (directive.type === 'for') {
        content += `<block ${this.directivePrefix}:for="{{${directive.for}}}"><template is="${directive.templateName}" data="{{...${VIEW_TEMPLATE_OBJECT}.${directive.templateVariable}[index]}}"></template></block>`;
      } else if (directive.type === 'switch') {
        if (directive.case) {
          if (directive.first) {
            content += `<block ${this.directivePrefix}:if="{{${directive.switchValue}===${directive.case}}}"><template is="${directive.templateName}" data="{{...${VIEW_TEMPLATE_OBJECT}.${directive.templateVariable}}}"></template></block>`;
          } else {
            content += `<block ${this.directivePrefix}:elif="{{${directive.switchValue}===${directive.case}}}"><template is="${directive.templateName}" data="{{...${VIEW_TEMPLATE_OBJECT}.${directive.templateVariable}}}"></template></block>`;
          }
        } else if (directive.default) {
          content += `<block ${this.directivePrefix}:else><template is="${directive.templateName}" data="{{...${VIEW_TEMPLATE_OBJECT}.${directive.templateVariable}}}"></template></block>`;
        } else {
          throw new Error('未知的解析指令');
        }
      } else {
        throw new Error('未知的解析节点');
      }
    }
    return content;
  }
  private ngTextTransform(node: NgTextMeta): string {
    return node.value;
  }
  private insertValue(value: BindValue | PlainValue) {
    if (value instanceof BindValue) {
      return `{{${value.value}}}`;
    } else {
      return value.value;
    }
  }

  getExportTemplate() {
    return this.exportTemplateList.map((item) => `${item.content}`).join('');
  }
}
