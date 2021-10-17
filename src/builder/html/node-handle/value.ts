export class BindValue {
  constructor(public value: string) {}
  toString() {
    return this.value;
  }
}
export class PlainValue {
  constructor(public value: string) {}
  toString() {
    return this.value;
  }
}

export function isBindValue(value: BindValue): value is BindValue {
  return value instanceof BindValue;
}
