export function parseNumber (element) {
  return element.operator === '-' ? -element.argument.value : element.value
}

export function parseNumberArray (elements) {
  return elements.map(v => {
    v.value = parseNumber(v)
    return v
  })
}
