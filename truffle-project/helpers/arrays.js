import assert from 'assert'

export const sum = array => array.reduce((a, b) => a + b)

export const only = (array, condition) => {
  const matches = array.filter(condition)
  return matches.length === 1 ? matches[0] : undefined
}

export const unzip = (...ababab) => {
  if (ababab.length === 0) {
    return [[], []]
  } else {
    const [[a, b], ...abab] = ababab
    const [aa, bb] = unzip(...abab)
    return [[a, ...aa], [b, ...bb]]
  }
}

export const zip = (aaa, bbb) => {
  if (aaa.length === 0 || bbb.length === 0) {
    return []
  } else {
    const [[a, ...aa], [b, ...bb]] = [aaa, bbb]
    return [[a, b]].concat(zip(aa, bb))
  }
}

export const containsDuplicates = (array, compare) => {
  assert(array.length >= 1)
  if (array.length === 1) {
    return false
  } else {
    const sorted = array.slice(0).sort(compare)
    return zip(sorted, sorted.slice(1)).some(([a, b]) => compare(a, b) === 0)
  }
}

export const integers = n => {
  const result = new Array(n)
  for (let i = 0; i < n; i++) {
    result[i] = i
  }
  return result
}

export const flatten = arrayOfArrays =>
  arrayOfArrays.reduce((array1, array2) => array1.concat(array2), [])
