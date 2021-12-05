/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import {
  Directive,
  ElementRef,
  HostBinding,
  Renderer2,
  forwardRef,
} from '@angular/core';

import {
  BuiltInControlValueAccessor,
  ControlValueAccessor,
  NG_VALUE_ACCESSOR,
} from './control_value_accessor';

export const SWITCH_VALUE_ACCESSOR: any = {
  provide: NG_VALUE_ACCESSOR,
  useExisting: forwardRef(() => PickerValueAccessor),
  multi: true,
};

/**
 * @description
 * The `ControlValueAccessor` for writing a number value and listening to number input changes.
 * The value accessor is used by the `FormControlDirective`, `FormControlName`, and `NgModel`
 * directives.
 *
 * @usageNotes
 *
 * ### Using a number input with a reactive form.
 *
 * The following example shows how to use a number input with a reactive form.
 *
 * ```ts
 * const totalCountControl = new FormControl();
 * ```
 *
 * ```
 * <input type="number" [formControl]="totalCountControl">
 * ```
 *
 * @ngModule ReactiveFormsModule
 * @ngModule FormsModule
 * @publicApi
 */
@Directive({
  selector: 'picker[formControlName],picker[formControl],picker[ngModel]',
  host: { '(bindchange)': 'valueChange($event.detail.value)' },
  providers: [SWITCH_VALUE_ACCESSOR],
})
export class PickerValueAccessor
  extends BuiltInControlValueAccessor
  implements ControlValueAccessor
{
  @HostBinding('value') value: number | any[] | string | undefined;
  @HostBinding('disabled') disabled: boolean | undefined;
  /**
   * Sets the "value" property on the input element.
   * @nodoc
   */
  writeValue(value: number | any[] | string): void {
    const normalizedValue = value == null ? undefined : value;
    if (typeof normalizedValue !== 'undefined') {
      this.value = normalizedValue;
    }
  }
  valueChange(value: any) {
    this.value = value;
    this.onChange(value);
  }
}
