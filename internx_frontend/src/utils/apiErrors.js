export function getErrorMessages(error, fallback = 'Something went wrong.') {
  const data = error?.response?.data

  if (!data) {
    return [fallback]
  }

  if (typeof data === 'string') {
    return [data]
  }

  if (typeof data.detail === 'string') {
    return [data.detail]
  }

  if (typeof data.message === 'string') {
    return [data.message]
  }

  if (typeof data.error === 'string') {
    return [data.error]
  }

  if (Array.isArray(data)) {
    return data.map((item) => stringifyMessage(item)).filter(Boolean)
  }

  if (typeof data === 'object') {
    return Object.values(data)
      .flatMap((value) => {
        if (Array.isArray(value)) {
          return value.map((item) => stringifyMessage(item))
        }
        return [stringifyMessage(value)]
      })
      .filter(Boolean)
  }

  return [fallback]
}

function stringifyMessage(value) {
  if (typeof value === 'string') {
    return value
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value)
  }

  if (value && typeof value === 'object') {
    if (typeof value.message === 'string') {
      return value.message
    }
    if (typeof value.detail === 'string') {
      return value.detail
    }
    if (typeof value.code === 'string') {
      return value.code
    }
  }

  return ''
}
