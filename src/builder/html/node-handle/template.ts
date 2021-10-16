import { ASTWithSource } from '@angular/compiler';
import { TypeCheckShimGenerator } from '@angular/compiler-cli/src/ngtsc/typecheck';
import {
  BoundAttribute,
  Template,
  TextAttribute,
} from '@angular/compiler/src/render3/r3_ast';
import { ExpressionConvert } from '../expression-to-string';
import { TemplateDefinition } from '../template-definition';
import { ParsedNgElement } from './element';
import { GlobalContext } from './global-context';
import {
  NgDefaultDirective,
  NgDirective,
  NgForDirective,
  NgIfDirective,
  NgNodeKind,
  NgNodeMeta,
  NgSwitchDirective,
  NgTemplateMeta,
  ParsedNode,
} from './interface';
import { isElement } from './type-predicate';
import { BindValue, PlainValue } from './value';

export class NgTemplate implements ParsedNode<NgTemplateMeta> {
  kind = NgNodeKind.Template;
  attrs!: (BoundAttribute | TextAttribute)[];
  bindValueList: string[] = [];
  declareContext: Record<string, string> = {};
  autoGenerateValueList: string[] = [];
  private children: ParsedNode<NgNodeMeta>[] = [];
  private templateDefinition!: TemplateDefinition;

  constructor(
    private node: Template,
    public parent: ParsedNode<NgNodeMeta> | undefined
  ) {}

  getOriginChildren() {
    return this.node.children;
  }
  setNgNodeChildren(children: ParsedNode<NgNodeMeta>[]) {
    this.children = children;
  }
  private transform(): NgDirective[] | undefined {
    /**
     * 根据指令判断如何处理
     *
     */
    this.attrs = this.node.templateAttrs;
    const isNgIf = this.attrs.some((item) => item.name === 'ngIf');
    const isNgFor = this.attrs.some(
      (item) => item.name === 'ngFor' || item.name === 'ngForOf'
    );
    const isSwitch = this.attrs.some(
      (item) => item.name === 'ngSwitchCase' || item.name === 'ngSwitchDefault'
    );

    if (isNgIf) {
      return this.ngIfTransform();
    } else if (isNgFor) {
      return [this.ngForTramsform()];
    } else if (isSwitch) {
      return [this.ngSwitchTransform()];
    } else if (this.node.tagName === 'ng-template') {
      return [this.defaultTransform()];
    } else {
      throw new Error('没有找到对应指令.目前仅支持ngIf,ngFor,ngSwitch');
    }
  }
  private defaultTransform(): NgDefaultDirective {
    return {
      type: 'none',
      name: this.node.references.map((item) => ({
        name: item.name,
        value: item.value,
      })),
    };
  }
  private ngIfTransform(): NgDirective[] {
    const ngIf = this.attrs.find((item) => item.name === 'ngIf')!;
    const ngIfElse = this.attrs.find((item) => item.name === 'ngIfElse')!;
    const ngIfThen = this.attrs.find((item) => item.name === 'ngIfThen')!;
    const ngIfTemplateName = `ngIf${Math.random().toString(36).slice(2)}`;
    return [
      {
        type: 'if',
        assert: this.getAttrValue(ngIf),
        thenTemplateRef:
          (ngIf && ngIfThen && this.getAttrValue(ngIfThen, false)) ||
          new PlainValue(ngIfTemplateName),
        falseTemplateRef: ngIfElse && this.getAttrValue(ngIfElse, false),
        trueVariable:
          this.templateDefinition.templateCallPositionMap.get(ngIf)!,
        falseVariable:
          this.templateDefinition.templateCallPositionMap.get(ngIfElse)!,
      },
      {
        type: 'none',
        name: [{ name: ngIfTemplateName, value: ngIfTemplateName }],
      },
    ];
  }
  private ngForTramsform(): NgForDirective {
    const ngFor = this.attrs.find((item) => item.name === 'ngForOf')!;
    const ngForValue = this.getAttrValue(ngFor);
    const ngForItem = this.node.variables.find(
      (item) => item.value === '$implicit'
    )!;
    this.autoGenerateValueList.push(ngForItem.name);
    const ngForIndex = this.node.variables.find(
      (item) => item.value === 'index'
    );
    if (ngForIndex) {
      this.autoGenerateValueList.push(ngForIndex.name);
    }
    return {
      type: 'for',
      for: ngForValue,
      item: ngForItem.name,
      index: ngForIndex ? ngForIndex.name : 'index',
    };
  }
  private ngSwitchTransform(): NgDirective {
    const ngSwitchDefault = this.attrs.find(
      (item) => item.name === 'ngSwitchDefault'
    );
    const ngSwitchCase = this.attrs.find(
      (item) => item.name === 'ngSwitchCase'
    );
    let parent = this.parent;
    let result: { first: boolean; ngSwitch: BoundAttribute } | undefined;
    while (parent) {
      if (isElement(parent)) {
        result = parent.getNgSwitch();
        if (result) {
          break;
        }
      }
      parent = parent.parent;
    }
    const switchValueExpression = new ExpressionConvert(
      this.templateDefinition
    );
    const switchValue = switchValueExpression.toString(
      (result!.ngSwitch.value as ASTWithSource).ast
    );
    this.bindValueList.push(...switchValueExpression.propertyReadList);
    return {
      type: 'switch',
      default: !!ngSwitchDefault,
      case: ngSwitchCase && this.getAttrValue(ngSwitchCase),
      switchValue: switchValue,
      first: result!.first,
    };
  }
  private getAttrValue(
    value: BoundAttribute | TextAttribute,
    record: boolean = true
  ) {
    if (typeof value.value === 'string') {
      return new PlainValue(value.value);
    } else {
      const instance = new ExpressionConvert(this.templateDefinition);
      const string = instance.toString((value.value as ASTWithSource).ast);
      const result = new BindValue(string);
      if (record) {
        this.bindValueList.push(...instance.propertyReadList);
      }
      return result;
    }
  }
  getNodeMeta(globalContext: GlobalContext): NgTemplateMeta {
    const directiveList = this.transform()!;

    const meta: NgTemplateMeta = {
      kind: NgNodeKind.Template,
      children: this.children.map((child) => child.getNodeMeta(globalContext)),
      directive: directiveList,
      data: this.getBindValueList().map((item) => item.split('.')[0]),
    };
    for (let i = 0; i < directiveList.length; i++) {
      const directive = directiveList[i];

      if (directive.type == 'none') {
        globalContext.addTemplate(meta as NgTemplateMeta<NgDefaultDirective>);
      }
    }
    return meta;
  }
  getBindValueList() {
    const list = [
      ...this.bindValueList,
      ...this.children
        .map((item) => item.getBindValueList())
        .reduce((pre, cur) => {
          pre.push(...cur);
          return pre;
        }, []),
    ];
    const parentList = this.getParentBindValueList();
    return list.filter((item) => !parentList.includes(item));
  }
  getParentBindValueList() {
    if (this.parent) {
      return [
        ...this.parent.bindValueList,
        ...(this.parent.autoGenerateValueList || []),
        ...this.parent.getParentBindValueList(),
      ];
    }
    return [];
  }
  setDefinition(definition: TemplateDefinition) {
    this.templateDefinition = definition;
  }
}
