import { strings } from '@angular-devkit/core';
import type { NgNodeMeta } from '../../../mini-program-compiler';
import { TemplateTransformBase } from '../transform.base';
import { WxContainer } from './wx-container';

export const EVENT_PREFIX_REGEXP =
  /^(bind|catch|mut-bind|capture-bind|capture-catch)(.*)$/;
export abstract class WxTransformLike extends TemplateTransformBase {
  seq = ':';
  templateInterpolation: [string, string] = ['{{', '}}'];
  abstract directivePrefix: string;

  constructor() {
    super();
  }
  init() {
    WxContainer.initWxContainerFactory({
      seq: this.seq,
      directivePrefix: this.directivePrefix,
      eventListConvert: this.eventListConvert,
      templateInterpolation: this.templateInterpolation,
    });
  }
  compile(nodes: NgNodeMeta[]) {
    const container = new WxContainer();

    nodes.forEach((node) => {
      container.compileNode(node);
    });
    const result = container.export();
    const metaCollectionGroup = container.exportMetaCollectionGroup();
    const inlineMetaCollection = metaCollectionGroup.$inline;
    delete metaCollectionGroup.$inline;
    return {
      content: `<block ${this.directivePrefix}${this.seq}if="{{hasLoad}}">${result.wxmlTemplate}</block> `,
      template: inlineMetaCollection.templateList
        .map((item) => item.content)
        .join(''),
      useComponentPath: {
        localPath: [...inlineMetaCollection.localPath],
        libraryPath: [...inlineMetaCollection.libraryPath],
      },
      otherMetaGroup: metaCollectionGroup,
    };
  }

  getData() {
    return { directivePrefix: this.directivePrefix };
  }
  eventNameConvert(tagEventMeta: string) {
    const result = tagEventMeta.match(EVENT_PREFIX_REGEXP);
    let prefix: string = 'bind';
    let type: string = tagEventMeta;
    if (result) {
      prefix = result[1];
      type = result[2];
    }
    return {
      prefix,
      type,
      name: `${prefix}:${type}`,
    };
  }
  eventListConvert = (list: string[]) => {
    const nodeEventGroup: Record<string, Record<string, string[]>> = {};
    const eventMap = new Map();
    list.forEach((eventName) => {
      const result = this.eventNameConvert(eventName);
      const prefix = strings.camelize(result.prefix);
      if (nodeEventGroup[prefix] && nodeEventGroup[prefix][result.type]) {
      }
      const eventList = [eventName];
      nodeEventGroup[prefix] = nodeEventGroup[prefix] || {};
      nodeEventGroup[prefix][result.type] = eventList;
      eventMap.set(result.name, `${prefix}Event`);
    });

    return [
      ...Array.from(eventMap.entries()).map(
        ([key, value]) => `${key}="${value}"`
      ),
    ].join(' ');
  };
}
