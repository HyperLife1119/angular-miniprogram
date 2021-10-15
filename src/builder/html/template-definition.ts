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
  varIndexMap = new Map<any, number>();
  private templateDefinitionMap = new Map<Template, TemplateDefinition>();
  /** 模板某个指令对应的模板定义  */
  templateUseMap = new Map<any, TemplateDefinition>();
  index = 0;
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
          this.varIndexMap.set((item.value as ASTWithSource).ast, this.index);
        } else if (item.type !== BindingType.Animation) {
          this.varIndexMap.set((item.value as ASTWithSource).ast, this.index);
          this.index++;
        }
      });
    visitAll(this, element.children);
  }
  /**
   * 先查定义
   * 然后再查引用
   * 最后再ngif及ngfor,ngtemplateoutlet上面找对应的模板,进行标识
   */
  visitTemplate(template: Template) {
    const instance = new TemplateDefinition(template.children);
    this.templateDefinitionMap.set(template, instance);

    instance.run();
  }
  visitContent(content: Content) {}
  visitVariable(variable: Variable) {}
  visitReference(reference: Reference) {}
  visitTextAttribute(attribute: TextAttribute) {}
  visitBoundAttribute(attribute: BoundAttribute) {}
  visitBoundEvent(attribute: BoundEvent) {
    return undefined;
  }
  visitText(text: Text) {
    return undefined;
  }
  visitBoundText(text: BoundText) {
    const value = (text.value as ASTWithSource).ast;
    if (value instanceof Interpolation) {
      const length = value.expressions.length;
      value.expressions.forEach((expression, i) => {
        this.varIndexMap.set(expression, i + this.index);
      });
      this.index += length;
    }
  }
  visitIcu(icu: Icu) {
    return undefined;
  }
  run() {
    visitAll(this, this.nodes);
    this.templateDefinitionMap.forEach((key, template) => {
      const ngIf = template.templateAttrs.find((attr) => attr.name === 'ngIf');
      const ngElseIf = template.templateAttrs.find(
        (attr) => attr.name === 'ngIfElse'
      );
      if (ngIf) {
        this.templateUseMap.set(ngIf, key);
      }
      if (ngElseIf) {
        this.templateDefinitionMap.forEach((value, key) => {
          const find = key.references.find(
            (item) => item.name === (ngElseIf?.value as any).source
          );
          if (find) {
            this.templateUseMap.set(ngElseIf, value);
          }
        });
      }
    });
  }
}
