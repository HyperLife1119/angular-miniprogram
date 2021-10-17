import { ASTWithSource, PropertyRead } from '@angular/compiler';
import {
  BoundAttribute,
  Template,
  TextAttribute,
} from '@angular/compiler/src/render3/r3_ast';
import { ExpressionConvert } from '../expression-to-string';
import { TemplateDefinition } from '../template-definition';
import { GlobalContext } from './global-context';
import {
  NgDefaultDirective,
  NgDirective,
  NgNodeKind,
  NgNodeMeta,
  NgTemplateMeta,
  ParsedNode,
} from './interface';
import { isElement } from './type-predicate';
import { BindValue } from './value';

export class NgTemplate implements ParsedNode<NgTemplateMeta> {
  kind = NgNodeKind.Template;
  attrs!: (BoundAttribute | TextAttribute)[];
  bindValueList: string[] = [];
  declareContext: Record<string, string> = {};
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
      return this.ngForTramsform();
    } else if (isSwitch) {
      return this.ngSwitchTransform();
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
          (ngIf &&
            ngIfThen &&
            new BindValue(
              ((ngIfThen?.value as ASTWithSource)?.ast as PropertyRead)?.name
            )) ||
          new BindValue(ngIfTemplateName),
        falseTemplateRef:
          ngIfElse &&
          new BindValue(
            ((ngIfElse?.value as ASTWithSource)?.ast as PropertyRead)?.name
          ),
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
  private ngForTramsform(): NgDirective[] {
    const ngFor = this.attrs.find((item) => item.name === 'ngFor')!;
    const ngForOf = this.attrs.find((item) => item.name === 'ngForOf')!;
    const ngForValue = this.getAttrValue(ngForOf);
    const ngForTemplateName = `ngFor${Math.random().toString(36).slice(2)}`;

    return [
      {
        type: 'for',
        for: ngForValue,
        templateName: ngForTemplateName,
        templateVariable:
          this.templateDefinition.templateCallPositionMap.get(ngFor)!,
      },
      {
        type: 'none',
        name: [{ name: ngForTemplateName, value: ngForTemplateName }],
      },
    ];
  }
  private ngSwitchTransform(): NgDirective[] {
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
    const ngSwitchTemplateName = `ngSwitch${Math.random()
      .toString(36)
      .slice(2)}`;

    return [
      {
        type: 'switch',
        default: !!ngSwitchDefault,
        case: ngSwitchCase && this.getAttrValue(ngSwitchCase),
        switchValue: switchValue,
        first: result!.first,
        templateVariable: this.templateDefinition.templateCallPositionMap.get(
          ngSwitchDefault || ngSwitchCase
        )!,
        templateName: ngSwitchTemplateName,
      },
      {
        type: 'none',
        name: [{ name: ngSwitchTemplateName, value: ngSwitchTemplateName }],
      },
    ];
  }
  private getAttrValue(
    value: BoundAttribute | TextAttribute,
    record: boolean = true
  ) {
    if (typeof value.value === 'string') {
      throw new Error('不应该存在纯文本变量');
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
