import { Node } from '@angular/compiler/src/render3/r3_ast';
import { nodeIteration } from '../node-iteration';
import { TemplateDefinition } from '../template-definition';
import {
  isBoundText,
  isContent,
  isElement,
  isTemplate,
  isText,
} from '../type-protection';
import { ParsedNgBoundText } from './bound-text';
import { ParsedNgContent } from './content';
import { ParsedNgElement } from './element';
import { GlobalContext } from './global-context';
import { NgNodeMeta, ParsedNode } from './interface';
import { NgTemplate } from './template';
import { ParsedNgText } from './text';

export function generateParsedNode(
  node: Node,
  parent: ParsedNode<NgNodeMeta> | undefined,
  globalContext: GlobalContext,
  definition: TemplateDefinition
): ParsedNode<NgNodeMeta> {
  return nodeIteration(node, {
    Element: (node) => {
      const instance = new ParsedNgElement(node, parent);
      const childrenInstance = instance
        .getOriginChildren()
        .map((node) =>
          generateParsedNode(node, instance, globalContext, definition)
        );
      instance.setDefinition(definition);
      instance.setNgNodeChildren(childrenInstance);
      return instance;
    },
    BoundText: (node) => {
      const instance = new ParsedNgBoundText(node, parent);
      instance.setDefinition(definition);
      return instance;
    },
    Text: (node) => {
      return new ParsedNgText(node, parent);
    },
    Template: (node) => {
      const instance = new NgTemplate(node, parent);
      instance.setDefinition(definition);
      const childDefinition = definition.templateDefinitionMap.get(node)!;
      const childrenInstance = instance
        .getOriginChildren()
        .map((node) =>
          generateParsedNode(node, instance, globalContext, childDefinition)
        );
      instance.setNgNodeChildren(childrenInstance);
      return instance;
    },
    Content: (node) => {
      return new ParsedNgContent(node, parent);
    },
    default: (node) => {
      throw new Error('未实现');
    },
  });
}
