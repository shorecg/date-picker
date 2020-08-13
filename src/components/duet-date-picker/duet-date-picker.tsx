import {
  Component,
  ComponentInterface,
  Host,
  Prop,
  Element,
  h,
  Event,
  EventEmitter,
  State,
  Listen,
  Method,
} from "@stencil/core"
import { DatePickerInput } from "./date-picker-input"
import {
  printDate,
  addDays,
  startOfWeek,
  endOfWeek,
  parseDate,
  setMonth,
  setYear,
  clamp,
  inRange,
  endOfMonth,
  startOfMonth,
  printISODate,
  parseISODate,
  createIdentifier,
} from "./date-utils"
import { DatePickerMonth } from "./date-picker-month"
import i18n from "./date-i18n"

function range(from: number, to: number) {
  var result = []
  for (var i = 0; i <= to - from; i++) {
    result.push(from + i)
  }
  return result
}

const keyCode = {
  TAB: 9,
  ESC: 27,
  SPACE: 32,
  PAGE_UP: 33,
  PAGE_DOWN: 34,
  END: 35,
  HOME: 36,
  LEFT: 37,
  UP: 38,
  RIGHT: 39,
  DOWN: 40,
}

export type DuetLanguage = "fi" | "en" | "sv"

export type DuetDatePickerChangeEvent = {
  component: "duet-date-picker"
  valueAsDate: Date
  value: string
}
export type DuetDatePickerFocusEvent = {
  component: "duet-date-picker"
}

const DISALLOWED_CHARACTERS = /[^0-9\.]+/g
const TRANSITION_MS = 400

@Component({
  tag: "duet-date-picker",
  styleUrl: "duet-date-picker.scss",
  shadow: false,
  scoped: false,
})
export class DuetDatePicker implements ComponentInterface {
  private monthSelectId = createIdentifier("DuetDateMonth")
  private yearSelectId = createIdentifier("DuetDateYear")
  private dialogLabelId = createIdentifier("DuetDateLabel")

  private datePickerButton: HTMLButtonElement
  private datePickerInput: HTMLInputElement
  private firstFocusableElement: HTMLElement
  private monthSelectNode: HTMLElement
  private dialogWrapperNode: HTMLElement
  private focusedDayNode: HTMLButtonElement

  private focusTimeoutId: ReturnType<typeof setTimeout>

  private initialTouchX: number = null
  private initialTouchY: number = null

  @State() activeFocus = false
  @State() open = false
  @State() focusedDay = new Date()

  /**
   * Reference to host HTML element.
   */
  @Element() element: HTMLElement

  /**
   * Name of the date picker input.
   */
  @Prop() name: string = ""

  /**
   * Adds a unique identifier for the date picker input.
   */
  @Prop() identifier: string = ""

  /**
   * The currently active language. This setting changes the month/year/day
   * names and button labels as well as all screen reader labels.
   */
  @Prop() language: DuetLanguage = "en"

  /**
   * Makes the date picker input component disabled. This prevents users from being able to
   * interact with the input, and conveys its inactive state to assistive technologies.
   */
  @Prop({ reflect: true }) disabled: boolean = false

  /**
   * Defines a specific role attribute for the date picker input.
   */
  @Prop() role: string

  /**
   * Date value. Must be in IS0-8601 format: YYYY-MM-DD
   */
  @Prop({ reflect: true }) value: string = ""

  /**
   * Minimum date allowed to be picked. Must be in IS0-8601 format: YYYY-MM-DD.
   * This setting can be used alone or together with the max property.
   */
  @Prop() min: string = ""

  /**
   * Minimum date allowed to be picked. Must be in IS0-8601 format: YYYY-MM-DD
   * This setting can be used alone or together with the min property.
   */
  @Prop() max: string = ""

  /**
   * Event emitted when a date is selected.
   */
  @Event() duetChange: EventEmitter<DuetDatePickerChangeEvent>

  /**
   * Event emitted the date picker input is blurred.
   */
  @Event() duetBlur: EventEmitter<DuetDatePickerFocusEvent>

  /**
   * Event emitted the date picker input is focused.
   */
  @Event() duetFocus: EventEmitter<DuetDatePickerFocusEvent>

  /**
   * Sets focus on the date picker's input. Use this method instead of the global `focus()`.
   */
  @Method() async setFocus() {
    return this.datePickerInput.focus()
  }

  /**
   * Show the calendar modal, moving focus to the calendar inside.
   */
  @Method() async show() {
    this.open = true
    this.setFocusedDay(parseISODate(this.value) || new Date())

    clearTimeout(this.focusTimeoutId)
    this.focusTimeoutId = setTimeout(() => this.monthSelectNode.focus(), TRANSITION_MS)
  }

  /**
   * Hide the calendar modal. Set `moveFocusToButton` to false to prevent focus
   * returning to the date picker's button. Default is true.
   */
  @Method() async hide(moveFocusToButton = true) {
    this.open = false

    // in cases where calendar is quickly shown and hidden
    // we should avoid moving focus to the button
    clearTimeout(this.focusTimeoutId)

    if (moveFocusToButton) {
      // iOS VoiceOver needs to wait for all transitions to finish.
      setTimeout(() => this.datePickerButton.focus(), TRANSITION_MS)
    }
  }

  private enableActiveFocus = () => {
    this.activeFocus = true
  }

  private disableActiveFocus = () => {
    this.activeFocus = false
  }

  private addDays(days: number) {
    this.setFocusedDay(addDays(this.focusedDay, days))
  }

  private addMonths(months: number) {
    this.setMonth(this.focusedDay.getMonth() + months)
  }

  private addYears(years: number) {
    this.setYear(this.focusedDay.getFullYear() + years)
  }

  private startOfWeek() {
    this.setFocusedDay(startOfWeek(this.focusedDay))
  }

  private endOfWeek() {
    this.setFocusedDay(endOfWeek(this.focusedDay))
  }

  private setMonth(month: number) {
    const min = setMonth(startOfMonth(this.focusedDay), month)
    const max = endOfMonth(min)
    const date = setMonth(this.focusedDay, month)

    this.setFocusedDay(clamp(date, min, max))
  }

  private setYear(year: number) {
    const min = setYear(startOfMonth(this.focusedDay), year)
    const max = endOfMonth(min)
    const date = setYear(this.focusedDay, year)

    this.setFocusedDay(clamp(date, min, max))
  }

  private setFocusedDay(day: Date) {
    this.focusedDay = clamp(day, parseISODate(this.min), parseISODate(this.max))
  }

  private toggleOpen = (e: Event) => {
    e.preventDefault()
    this.open ? this.hide(false) : this.show()
  }

  private handleEscKey = (event: KeyboardEvent) => {
    if (event.keyCode === keyCode.ESC) {
      this.hide()
    }
  }

  private handleBlur = (event: Event) => {
    event.stopPropagation()

    this.duetBlur.emit({
      component: "duet-date-picker",
    })
  }

  private handleFocus = (event: Event) => {
    event.stopPropagation()

    this.duetFocus.emit({
      component: "duet-date-picker",
    })
  }

  private handleTouchStart = (event: TouchEvent) => {
    const touch = event.changedTouches[0]
    this.initialTouchX = touch.pageX
    this.initialTouchY = touch.pageY
  }

  private handleTouchMove = (event: TouchEvent) => {
    event.preventDefault()
  }

  private handleTouchEnd = (event: TouchEvent) => {
    const touch = event.changedTouches[0]
    const distX = touch.pageX - this.initialTouchX // get horizontal dist traveled
    const distY = touch.pageY - this.initialTouchY // get vertical dist traveled
    const threshold = 70

    const isHorizontalSwipe = Math.abs(distX) >= threshold && Math.abs(distY) <= threshold
    const isDownwardsSwipe = Math.abs(distY) >= threshold && Math.abs(distX) <= threshold && distY > 0

    if (isHorizontalSwipe) {
      this.addMonths(distX < 0 ? 1 : -1)
    } else if (isDownwardsSwipe) {
      this.hide()
      event.preventDefault()
    }

    this.initialTouchY = null
    this.initialTouchX = null
  }

  private handleNextMonthClick = (event: MouseEvent) => {
    event.preventDefault()
    this.addMonths(1)
  }

  private handlePreviousMonthClick = (event: MouseEvent) => {
    event.preventDefault()
    this.addMonths(-1)
  }

  private handleFirstFocusableKeydown = (event: KeyboardEvent) => {
    // this ensures focus is trapped inside the dialog
    if (event.keyCode === keyCode.TAB && event.shiftKey) {
      this.focusedDayNode.focus()
      event.preventDefault()
    }
  }

  private handleKeyboardNavigation = (event: KeyboardEvent) => {
    // handle tab separately, since it needs to be treated
    // differently to other keyboard interactions
    if (event.keyCode === keyCode.TAB && !event.shiftKey) {
      event.preventDefault()
      this.firstFocusableElement.focus()
      return
    }

    var handled = true

    switch (event.keyCode) {
      case keyCode.RIGHT:
        this.addDays(1)
        break
      case keyCode.LEFT:
        this.addDays(-1)
        break
      case keyCode.DOWN:
        this.addDays(7)
        break
      case keyCode.UP:
        this.addDays(-7)
        break
      case keyCode.PAGE_UP:
        if (event.shiftKey) {
          this.addYears(-1)
        } else {
          this.addMonths(-1)
        }
        break
      case keyCode.PAGE_DOWN:
        if (event.shiftKey) {
          this.addYears(1)
        } else {
          this.addMonths(1)
        }
        break
      case keyCode.HOME:
        this.startOfWeek()
        break
      case keyCode.END:
        this.endOfWeek()
        break
      default:
        handled = false
    }

    if (handled) {
      event.preventDefault()
      this.enableActiveFocus()
    }
  }

  private handleDaySelect = (_event: MouseEvent, day: Date) => {
    if (!inRange(day, parseISODate(this.min), parseISODate(this.max))) {
      return
    }

    if (day.getMonth() === this.focusedDay.getMonth()) {
      this.setValue(day)
      this.hide()
    } else {
      this.setFocusedDay(day)
    }
  }

  private handleMonthSelect = e => {
    this.setMonth(parseInt(e.target.value, 10))
  }

  private handleYearSelect = e => {
    this.setYear(parseInt(e.target.value, 10))
  }

  private handleInputChange = (e: InputEvent) => {
    const target = e.target as HTMLInputElement

    // clean up any invalid characters
    target.value = target.value.replace(DISALLOWED_CHARACTERS, "")

    const parsed = parseDate(target.value)
    if (parsed || target.value === "") {
      this.setValue(parsed)
    }
  }

  private setValue(date: Date) {
    this.value = printISODate(date)
    this.duetChange.emit({
      component: "duet-date-picker",
      value: this.value,
      valueAsDate: date,
    })
  }

  @Listen("click", { target: "document", capture: true }) handleDocumentClick(e: MouseEvent) {
    if (!this.open) {
      return
    }

    const target = e.target as Node

    // TODO: stopPropagation only on open??

    // the dialog and the button aren't considered clicks outside.
    // dialog for obvious reasons, but the button needs to be skipped
    // so that two things are possible:
    //
    // a) clicking again on the button when dialog is open should close the modal.
    //    without skipping the button here, we would see a click outside
    //    _and_ a click on the button, so the `open` state goes
    //    open -> close (click outside) -> open (click button)
    //
    // b) clicking another date picker's button should close the current calendar
    //    and open the new one. this means we can't stopPropagation() on the button itself
    //
    // this was the only satisfactory combination of things to get the above to work
    if (this.dialogWrapperNode.contains(target) || this.datePickerButton.contains(target)) {
      return
    }

    this.hide(false)
  }

  private processFocusedDayNode = (element: HTMLButtonElement) => {
    this.focusedDayNode = element

    if (this.activeFocus && this.open) {
      setTimeout(() => element.focus(), 0)
    }
  }

  /**
   * render() function
   * Always the last one in the class.
   */
  render() {
    const valueAsDate = parseISODate(this.value)
    const formattedDate = printDate(valueAsDate)
    const selectedYear = (valueAsDate || this.focusedDay).getFullYear()
    const focusedMonth = this.focusedDay.getMonth()
    const focusedYear = this.focusedDay.getFullYear()
    const text = i18n[this.language]

    const minDate = parseISODate(this.min)
    const maxDate = parseISODate(this.max)
    const prevMonthDisabled =
      minDate != null && minDate.getMonth() === focusedMonth && minDate.getFullYear() === focusedYear
    const nextMonthDisabled =
      maxDate != null && maxDate.getMonth() === focusedMonth && maxDate.getFullYear() === focusedYear

    return (
      <Host>
        <div class="duet-date">
          <DatePickerInput
            value={formattedDate}
            onInput={this.handleInputChange}
            onBlur={this.handleBlur}
            onFocus={this.handleFocus}
            onClick={this.toggleOpen}
            name={this.name}
            disabled={this.disabled}
            role={this.role}
            placeholder={text.placeholder}
            buttonLabel={text.buttonLabel}
            identifier={this.identifier}
            buttonRef={element => (this.datePickerButton = element)}
            inputRef={element => (this.datePickerInput = element)}
          />

          <div
            class={{
              "duet-date__dialog": true,
              "is-active": this.open,
            }}
            role="dialog"
            aria-modal="true"
            aria-labelledby={this.dialogLabelId}
            onTouchMove={this.handleTouchMove}
            onTouchStart={this.handleTouchStart}
            onTouchEnd={this.handleTouchEnd}
          >
            <div
              class="duet-date__dialog-content"
              onKeyDown={this.handleEscKey}
              ref={element => (this.dialogWrapperNode = element)}
            >
              {/* @ts-ignore */}
              <div class="duet-date__mobile" onFocusin={this.disableActiveFocus}>
                <label class="duet-date__mobile-heading">{text.calendarHeading}</label>
                <button
                  class="duet-date__close"
                  ref={element => (this.firstFocusableElement = element)}
                  onKeyDown={this.handleFirstFocusableKeydown}
                  onClick={() => this.hide()}
                  aria-label={text.closeLabel}
                  type="button"
                >
                  <svg
                    aria-hidden="true"
                    fill="currentColor"
                    xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                  >
                    <path d="M0 0h24v24H0V0z" fill="none" />
                    <path d="M18.3 5.71c-.39-.39-1.02-.39-1.41 0L12 10.59 7.11 5.7c-.39-.39-1.02-.39-1.41 0-.39.39-.39 1.02 0 1.41L10.59 12 5.7 16.89c-.39.39-.39 1.02 0 1.41.39.39 1.02.39 1.41 0L12 13.41l4.89 4.89c.39.39 1.02.39 1.41 0 .39-.39.39-1.02 0-1.41L13.41 12l4.89-4.89c.38-.38.38-1.02 0-1.4z" />
                  </svg>
                </button>
              </div>
              {/* @ts-ignore */}
              <div class="duet-date__header" onFocusin={this.disableActiveFocus}>
                <div>
                  <h2 id={this.dialogLabelId} class="duet-date__vhidden" aria-live="polite">
                    {text.monthLabels[focusedMonth]} {this.focusedDay.getFullYear()}
                  </h2>

                  <label htmlFor={this.monthSelectId} class="duet-date__vhidden">
                    {text.monthSelectLabel}
                  </label>
                  <div class="duet-date__select">
                    <select
                      id={this.monthSelectId}
                      ref={element => (this.monthSelectNode = element)}
                      onChange={this.handleMonthSelect}
                    >
                      {text.monthLabels.map((month, i) => (
                        <option value={i} selected={i === focusedMonth}>
                          {month}
                        </option>
                      ))}
                    </select>
                    <div class="duet-date__select-label" aria-hidden="true">
                      <span>{text.monthLabelsShort[focusedMonth]}</span>
                      <svg
                        fill="currentColor"
                        xmlns="http://www.w3.org/2000/svg"
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                      >
                        <path d="M8.12 9.29L12 13.17l3.88-3.88c.39-.39 1.02-.39 1.41 0 .39.39.39 1.02 0 1.41l-4.59 4.59c-.39.39-1.02.39-1.41 0L6.7 10.7c-.39-.39-.39-1.02 0-1.41.39-.38 1.03-.39 1.42 0z" />
                      </svg>
                    </div>
                  </div>

                  <label htmlFor={this.yearSelectId} class="duet-date__vhidden">
                    {text.yearSelectLabel}
                  </label>
                  <div class="duet-date__select">
                    <select id={this.yearSelectId} onChange={this.handleYearSelect}>
                      {range(selectedYear - 10, selectedYear + 10).map(year => (
                        <option selected={year === focusedYear}>{year}</option>
                      ))}
                    </select>
                    <div class="duet-date__select-label" aria-hidden="true">
                      <span>{this.focusedDay.getFullYear()}</span>
                      <svg
                        fill="currentColor"
                        xmlns="http://www.w3.org/2000/svg"
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                      >
                        <path d="M8.12 9.29L12 13.17l3.88-3.88c.39-.39 1.02-.39 1.41 0 .39.39.39 1.02 0 1.41l-4.59 4.59c-.39.39-1.02.39-1.41 0L6.7 10.7c-.39-.39-.39-1.02 0-1.41.39-.38 1.03-.39 1.42 0z" />
                      </svg>
                    </div>
                  </div>
                </div>

                <div class="duet-date__nav">
                  <button
                    class="duet-date__prev"
                    onClick={this.handlePreviousMonthClick}
                    disabled={prevMonthDisabled}
                    aria-label={text.prevMonthLabel}
                    type="button"
                  >
                    <svg
                      aria-hidden="true"
                      fill="currentColor"
                      xmlns="http://www.w3.org/2000/svg"
                      width="21"
                      height="21"
                      viewBox="0 0 24 24"
                    >
                      <path d="M14.71 15.88L10.83 12l3.88-3.88c.39-.39.39-1.02 0-1.41-.39-.39-1.02-.39-1.41 0L8.71 11.3c-.39.39-.39 1.02 0 1.41l4.59 4.59c.39.39 1.02.39 1.41 0 .38-.39.39-1.03 0-1.42z" />
                    </svg>
                  </button>
                  <button
                    class="duet-date__next"
                    onClick={this.handleNextMonthClick}
                    disabled={nextMonthDisabled}
                    aria-label={text.nextMonthLabel}
                    type="button"
                  >
                    <svg
                      aria-hidden="true"
                      fill="currentColor"
                      xmlns="http://www.w3.org/2000/svg"
                      width="21"
                      height="21"
                      viewBox="0 0 24 24"
                    >
                      <path d="M9.29 15.88L13.17 12 9.29 8.12c-.39-.39-.39-1.02 0-1.41.39-.39 1.02-.39 1.41 0l4.59 4.59c.39.39.39 1.02 0 1.41L10.7 17.3c-.39.39-1.02.39-1.41 0-.38-.39-.39-1.03 0-1.42z" />
                    </svg>
                  </button>
                </div>
              </div>
              <DatePickerMonth
                selectedDate={valueAsDate}
                focusedDate={this.focusedDay}
                onDateSelect={this.handleDaySelect}
                onKeyboardNavigation={this.handleKeyboardNavigation}
                labelledById={this.dialogLabelId}
                language={this.language}
                focusedDayRef={this.processFocusedDayNode}
                min={minDate}
                max={maxDate}
              />
              <div class="duet-date__vhidden" aria-live="polite">
                {text.keyboardInstruction}
              </div>
            </div>
          </div>
        </div>
      </Host>
    )
  }
}