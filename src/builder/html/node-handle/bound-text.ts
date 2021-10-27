import { ASTWithSource, Interpolation } from '@angular/compiler';
import { BoundText } from '@angular/compiler/src/render3/r3_ast';
import { TemplateInterpolationService } from '../template-interpolation.service';
import {
  NgBoundTextMeta,
  NgElementMeta,
  NgNodeKind,
  NgNodeMeta,
  ParsedNode,
} from './interface';
import { BindValue, PlainValue } from './value';

export class ParsedNgBoundText implements ParsedNode<NgBoundTextMeta> {
  valueList: NgBoundTextMeta['values'] = [];
  kind = NgNodeKind.BoundText;
  bindValueList: string[] = [];
  constructor(
    private node: BoundText,
    public parent: ParsedNode<NgNodeMeta> | undefined,
    public templateInterpolationService: TemplateInterpolationService
  ) {}
  analysis() {
    const ast = (this.node.value as ASTWithSource).ast as Interpolation;
    ast.strings.forEach((item, i) => {
      this.valueList.push(new PlainValue(item));
      if (ast.expressions[i]) {
        const result =
          this.templateInterpolationService.expressionConvertToString(
            ast.expressions[i]
          );
        this.valueList.push(result);
      }
    });
  }
  getNodeMeta(): NgBoundTextMeta {
    this.analysis();
    return {
      kind: NgNodeKind.BoundText,
      values: this.valueList,
      data: this.getBindValueList(),
    };
  }
  getBindValueList() {
    const parentList = this.getParentBindValueList();
    return this.bindValueList.filter((item) => !parentList.includes(item));
  }
  getParentBindValueList() {
    if (this.parent) {
      return [
        // ...this.parent.bindValueList,
        ...(this.parent.autoGenerateValueList || []),
        ...this.parent.getParentBindValueList(),
      ];
    }
    return [];
  }
}
