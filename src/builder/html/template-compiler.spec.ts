import { WxTransform } from '../template-transform-strategy/wx.transform';
import { VIEW_TEMPLATE_OBJECT, VIEW_VALUE_LIST } from './const';
import { TemplateCompiler } from './template-compiler';

describe('template-compiler', () => {
  function defaultTransform(content: string) {
    const instance = new TemplateCompiler('', content, new WxTransform());
    return instance.transform();
  }
  // todo 标签
  it('一些标签->view', () => {
    ['div', 'p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6'].forEach((tag) => {
      const result = defaultTransform(`<${tag}></${tag}>`);
      expect(result.content).toContain(`<view`);
      expect(result.content).toContain(`</view>`);
      expect(result.content).toContain(`origin-tag-${tag}`);
      expect(result.context).toEqual([]);
    });
  });
  it('单闭合标签', () => {
    const result = defaultTransform(`<input>`);
    expect(result.content).toContain(`input`);
    expect(result.content).not.toContain(`</input>`);
    expect(result.context).toEqual([]);
  });
  it('ngIf->wx:if', () => {
    let result = defaultTransform(`<div *ngIf="a"></div>`);
    expect(result.content).toContain(`wx:if="{{${VIEW_VALUE_LIST}[0]}}"`);
    expect(result.content).toContain(`...${VIEW_TEMPLATE_OBJECT}.ngIf[0][0]`);
    result = defaultTransform(
      `<div *ngIf="a;else elseBlock"></div><ng-template #elseBlock></ng-template>`
    );
    expect(result.content).toContain(`wx:if="{{${VIEW_VALUE_LIST}[0]}}"`);
    expect(result.content).toContain(`...${VIEW_TEMPLATE_OBJECT}.ngIf[0][0]`);
    expect(result.content).toContain(`is="elseBlock"`);
    expect(result.content).toContain(
      `data="{{...${VIEW_TEMPLATE_OBJECT}.ngIf[0][0]}}"`
    );
    expect(result.content).toContain(`wx:else`);
    expect(result.template).toContain('name="elseBlock"');
    result = defaultTransform(
      `<div *ngIf="a;then thenBlock else elseBlock"></div><ng-template #elseBlock></ng-template><ng-template #thenBlock></ng-template>`
    );
    expect(result.content).toContain(`wx:if="{{${VIEW_VALUE_LIST}[0]}}`);
    expect(result.content).toContain(`wx:else`);
    expect(result.content).toContain(`is="thenBlock"`);
    expect(result.content).toContain(
      `data="{{...${VIEW_TEMPLATE_OBJECT}.ngIf[0][0]}}"`
    );
    expect(result.content).toContain(
      `data="{{...${VIEW_TEMPLATE_OBJECT}.ngIf[0][0]}}"`
    );
    expect(result.content).toContain(`is="elseBlock"`);
    expect(result.template).toContain('name="elseBlock"');
  });
  it('ng-template->template', () => {
    const result = defaultTransform(
      `<ng-template #templateRef>content1</ng-template>`
    );
    expect(result.template).toContain('name="templateRef"');
  });
  it('interpolation(插值)', () => {
    let result = defaultTransform(`{{a}}`);
    expect(result.content).toContain(`${VIEW_VALUE_LIST}[0]`);
    result = defaultTransform(`{{a.b}}`);
    expect(result.content).toContain(`${VIEW_VALUE_LIST}[0]`);
    result = defaultTransform(`{{a[0]}}`);
    expect(result.content).toContain(`${VIEW_VALUE_LIST}[0]`);
    result = defaultTransform(`{{a['aa']}}`);
    expect(result.content).toContain(`${VIEW_VALUE_LIST}[0]`);
    result = defaultTransform(`{{[a,'a']}}`);
    expect(result.content).toContain(`${VIEW_VALUE_LIST}[0]`);
    result = defaultTransform(`{{a?true:false}}`);
    expect(result.content).toContain(`${VIEW_VALUE_LIST}[0]`);
    result = defaultTransform(`{{a+b}}+{{c}}+d`);
    expect(result.content).toContain(`${VIEW_VALUE_LIST}[0]`);
    expect(result.content).toContain(`${VIEW_VALUE_LIST}[1]`);
    result = defaultTransform(`{{a[b]}}`);
    expect(result.content).toContain(`${VIEW_VALUE_LIST}[0]`);
  });
  it('插值常量绑定', () => {
    let result = defaultTransform(`{{'测试'}}`);
    expect(result.content).toContain(`${VIEW_VALUE_LIST}[0]`);
    result = defaultTransform(`{{a['prob1']}}`);
    expect(result.content).toContain(`${VIEW_VALUE_LIST}[0]`);
  });
  it('ng-content', () => {
    let result = defaultTransform(`<ng-content></ng-content>`);
    expect(result.content).toContain('<slot></slot>');
    result = defaultTransform(`<ng-content name="abc"></ng-content>`);
    expect(result.content).toContain('<slot name="abc"></slot>');
  });
  it('ng-template数据绑定', () => {
    let result = defaultTransform(`<div *ngIf="true">{{a}}</div>`);
    expect(result.content).toContain(`<import src="./template.wxml"/>`);
    expect(result.content).toContain(`wx:if="{{${VIEW_VALUE_LIST}[0]}}"`);
    expect(result.template).toContain(`${VIEW_VALUE_LIST}[0]`);
    result = defaultTransform(
      `<div *ngIf="true">{{a}}<span>{{b}}</span></div>`
    );
    expect(result.content).toContain(`wx:if="{{${VIEW_VALUE_LIST}[0]}}"`);

    expect(result.template).toContain(`${VIEW_VALUE_LIST}[0]`);
    expect(result.template).toContain(`${VIEW_VALUE_LIST}[1]`);
    result = defaultTransform(
      `<div *ngIf="true">{{a}}<div *ngIf="true">{{b}}</div></div>`
    );
    expect(result.content).toContain(`wx:if="{{${VIEW_VALUE_LIST}[0]}}"`);
    expect(result.content).toContain(
      `data="{{...${VIEW_TEMPLATE_OBJECT}.ngIf[0][0]}}"`
    );

    expect(result.template).toContain(`${VIEW_VALUE_LIST}[0]`);
    expect(result.template).toContain(`wx:if="{{${VIEW_VALUE_LIST}[1]}}"`);
    expect(result.template).toContain(
      `data="{{...${VIEW_TEMPLATE_OBJECT}.ngIf[0][0]}}"`
    );
  });
  it('ngFor=>wx:for', () => {
    let result = defaultTransform(`<div *ngFor="let item of list">
    {{item}}
</div>`);

    expect(result.content).toContain(`wx:for="{{${VIEW_VALUE_LIST}[0]}}"`);
    expect(result.content).toContain(
      `data="{{...${VIEW_TEMPLATE_OBJECT}.ngFor[0][index]}}"`
    );
    result = defaultTransform(`<div *ngFor="let item of list;let i=index">
    {{item}}
</div>`);
    expect(result.content).toContain(`wx:for="{{${VIEW_VALUE_LIST}[0]}}"`);
    expect(result.content).toContain(
      `data="{{...${VIEW_TEMPLATE_OBJECT}.ngFor[0][index]}}"`
    );
  });
  it('ngSwitch=>wx:if', () => {
    const result = defaultTransform(`<span [ngSwitch]="title">
    <p *ngSwitchCase="abc">1</p>
    <p *ngSwitchCase="false"></p>
    <p *ngSwitchDefault>2</p>
  </span>`);
    expect(result.content).toContain(
      `wx:if="{{${VIEW_VALUE_LIST}[0]===${VIEW_VALUE_LIST}[1]}}"`
    );
    expect(result.content).toContain(
      `wx:elif="{{${VIEW_VALUE_LIST}[0]===${VIEW_VALUE_LIST}[2]}}"`
    );
    expect(result.content).toContain(`wx:else`);
  });
  it('event', () => {
    const result = defaultTransform(`<div (bind:tap)="test($event);"></div>`);
    expect(result.content).toContain('bind:tap');
    expect(result.content).toContain('test');
    expect(result.content).not.toContain('$event');
  });
  it('内容', () => {
    const result = defaultTransform(`测试`);
    expect(result.content).toContain('测试');
  });
});
