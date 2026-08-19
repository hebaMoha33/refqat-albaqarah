export async function apiRequest(
  url,
  options = {}
) {
  const response =
    await fetch(
      url,
      {
        credentials: 'include',

        ...options,

        headers: {
          'Content-Type':
            'application/json',

          ...(options.headers || {})
        }
      }
    )

  const data =
    await response
      .json()
      .catch(() => ({}))

  if (!response.ok) {
    throw new Error(
      data?.message ||
      'حدث خطأ في الاتصال.'
    )
  }

  return data
}
