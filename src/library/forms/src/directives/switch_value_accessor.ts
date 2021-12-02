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
  useExisting: forwardRef(() => SwitchValueAccessor),
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
  selector: 'switch[formControlName],switch[formControl],switch[ngModel]',
  host: { '(bindchange)': 'onChange($event.detail.value)' },
  providers: [SWITCH_VALUE_ACCESSOR],
})
export class SwitchValueAccessor
  extends BuiltInControlValueAccessor
  implements ControlValueAccessor
{
  @HostBinding('checked') value: boolean | undefined;
  @HostBinding('disabled') disabled: boolean | undefined;
  /**
   * Sets the "value" property on the input element.
   * @nodoc
   */
  writeValue(value: boolean): void {
    const normalizedValue = value == null ? undefined : value;
    if (typeof normalizedValue !== 'undefined') {
      this.value = normalizedValue;
    }
  }
}
