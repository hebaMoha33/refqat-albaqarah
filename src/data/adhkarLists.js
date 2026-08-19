import {
  morningAdhkar,
  eveningAdhkar
} from './adhkar'


function isHundredTahleel(item) {
  const text =
    String(
      item?.text || ''
    )

  return (
    Number(item?.count) === 100 &&
    text.includes(
      'لا إله إلا الله وحده لا شريك له'
    )
  )
}


export const morningAdhkarList =
  morningAdhkar.filter(
    item =>
      !isHundredTahleel(item)
  )


export const eveningAdhkarList =
  eveningAdhkar