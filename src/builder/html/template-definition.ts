import { ASTWithSource, BindingType, Interpolation } from '@angular/compiler';
import {
  BoundAttribute,
  BoundEvent,
  BoundText,
  Content,
  Element,
  Icu,
  Node,
  Reference,
  Template,
  Text,
  TextAttribute,
  Variable,
  Visitor,
  visitAll,
} from '@angular/compiler/src/render3/r3_ast';

export class TemplateDefinition implements Visitor {
  /** 变量对应的值索引 */
  viewValueIndexMap = new Map<any, number>();
  templateDefinitionMap = new Map<Template, TemplateDefinition>();
  private index = 0;
  templateCallPositionMap = new Map<any, string>();
  private directiveObject = {
    ngIfThen: 0,
    ngIfElse: 0,
    ngSwitchCase: 0,
    ngSwitchDefault: 0,
    ngFor: 0,
  };
  constructor(private nodes: Node[]) {}
  visit?(node: Node) {}
  visitElement(element: Element) {
    element.inputs
      .filter((input) => {
        if (input.type === BindingType.Property && input.i18n) {
          return false;
        } else {
          return true;
        }
      })
      .forEach((item) => {
        let length = 0;
        if (
          item.type === BindingType.Class ||
          item.type === BindingType.Style
        ) {
          length = 2;
          // todo 这里的索引可能是0也可能是1
          this.viewValueIndexMap.set(
            (item.value as ASTWithSource).ast,
            this.index
          );
          this.index += length;
        } else if (item.type !== BindingType.Animation) {
          this.viewValueIndexMap.set(
            (item.value as ASTWithSource).ast,
            this.index
          );
          this.index++;
        }
      });
    visitAll(this, element.children);
  }
  /**
   * 先查定义
   * 然后再查引用
   * 最后再ngif及ngfor,ngtemplateoutlet上面找对应的模板,进行标识
   * todo 对于自定义结构型指令的处理
   */
  visitTemplate(template: Template) {
    const instance = new TemplateDefinition(template.children);
    this.templateDefinitionMap.set(template, instance);
    const ngIfThen = template.templateAttrs.find(
      (attr) => attr.name === 'ngIf'
    );
    const ngElseIf = template.templateAttrs.find(
      (attr) => attr.name === 'ngIfElse'
    );
    const ngSwitchCase = template.templateAttrs.find(
      (attr) => attr.name === 'ngSwitchCase'
    );
    const ngSwitchDefault = template.templateAttrs.find(
      (attr) => attr.name === 'ngSwitchDefault'
    );
    const ngFor = template.templateAttrs.find((attr) => attr.name === 'ngFor');

    template.templateAttrs.forEach((item) => {
      if (item instanceof BoundAttribute) {
        if (item.value !== undefined) {
          this.viewValueIndexMap.set((item.value as any).ast, this.index);
          this.index++;
        }
      }
    });
    if (ngIfThen) {
      this.templateCallPositionMap.set(
        ngIfThen,
        `ngIfThen${this.directiveObject.ngIfThen}`
      );
      this.directiveObject.ngIfThen += 1;
    }
    if (ngElseIf) {
      this.templateCallPositionMap.set(
        ngElseIf,
        `ngElseIf${this.directiveObject.ngIfElse}`
      );
      this.directiveObject.ngIfElse += 1;
    }
    if (ngSwitchCase) {
      this.templateCallPositionMap.set(
        ngSwitchCase,
        `ngSwitchCase${this.directiveObject.ngSwitchCase}`
      );
      this.directiveObject.ngSwitchCase += 1;
    }
    if (ngSwitchDefault) {
      this.templateCallPositionMap.set(
        ngSwitchDefault,
        `ngSwitchDefault${this.directiveObject.ngSwitchDefault}`
      );
      this.directiveObject.ngSwitchDefault += 1;
    }
    if (ngFor) {
      this.templateCallPositionMap.set(
        ngFor,
        `ngFor${this.directiveObject.ngFor}`
      );
      this.directiveObject.ngFor += 1;
    }
    instance.run();
  }
  visitContent(content: Content) {}
  visitVariable(variable: Variable) {}
  visitReference(reference: Reference) {}
  visitTextAttribute(attribute: TextAttribute) {}
  visitBoundAttribute(attribute: BoundAttribute) {}
  visitBoundEvent(attribute: BoundEvent) {}
  visitText(text: Text) {}
  visitBoundText(text: BoundText) {
    const value = (text.value as ASTWithSource).ast;
    if (value instanceof Interpolation) {
      const length = value.expressions.length;
      value.expressions.forEach((expression, i) => {
        this.viewValueIndexMap.set(expression, i + this.index);
      });
      this.index += length;
    }
  }
  visitIcu(icu: Icu) {}
  run() {
    visitAll(this, this.nodes);
  }
}
