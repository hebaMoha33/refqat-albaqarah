import {
  Capacitor,
  registerPlugin
} from '@capacitor/core'


const RefqatLiveActivity =
  registerPlugin(
    'RefqatLiveActivity'
  )


export function isLiveActivityPlatform() {
  return (
    Capacitor.getPlatform() ===
    'ios'
  )
}


/* =====================================
   START MORNING ADHKAR
===================================== */

export async function startMorningLiveActivity({
  completed = 0,
  total = 34,
  progress = 0
} = {}) {
  if (!isLiveActivityPlatform()) {
    return {
      supported: false
    }
  }


  return RefqatLiveActivity.start({
    type: 'morning',

    title:
      'أذكار الصباح',

    completed,

    total,

    progress
  })
}


/* =====================================
   UPDATE MORNING ADHKAR
===================================== */

export async function updateMorningLiveActivity({
  completed = 0,
  total = 34,
  progress = 0
} = {}) {
  if (!isLiveActivityPlatform()) {
    return {
      supported: false
    }
  }


  return RefqatLiveActivity.update({
    type: 'morning',

    completed,

    total,

    progress
  })
}


/* =====================================
   END MORNING ADHKAR
===================================== */

export async function endMorningLiveActivity() {
  if (!isLiveActivityPlatform()) {
    return {
      supported: false
    }
  }


  return RefqatLiveActivity.end({
    type: 'morning'
  })
}


/* =====================================
   CHECK SUPPORT
===================================== */

export async function getLiveActivityStatus() {
  if (!isLiveActivityPlatform()) {
    return {
      supported: false,
      enabled: false
    }
  }


  return RefqatLiveActivity.status()
}
