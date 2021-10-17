import { AST } from '@angular/compiler/src/expression_parser/ast';
import { VIEW_VALUE_LIST } from './const';
import { TemplateDefinition } from './template-definition';

export class ExpressionConvert {
  propertyReadList: string[] = [];
  constructor(private templateDefinition: TemplateDefinition) {}
  toString(expression: AST) {
    const varIndex = this.templateDefinition.viewValueIndexMap.get(expression);
    if (typeof varIndex !== 'number') {
      throw new Error(`未找到变量分配的索引${expression?.toString()}`);
    }

    return `${VIEW_VALUE_LIST}[${varIndex}]`;
  }
}
