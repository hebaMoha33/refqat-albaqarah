import {
  useEffect,
  useRef,
  useState
} from 'react'

import {
  createPortal
} from 'react-dom'

import './FloatingReminder.css'


function clamp(
  value,
  min,
  max
) {
  return Math.min(
    Math.max(
      value,
      min
    ),
    max
  )
}


function getDefaultPositionStyle(
  positionName,
  stackOffset = 0
) {
  const edge = 12

  const topValue =
    `calc(env(safe-area-inset-top, 0px) + ${
      edge + stackOffset
    }px)`

  const bottomValue =
    `calc(env(safe-area-inset-bottom, 0px) + ${
      edge + stackOffset
    }px)`


  switch (
    positionName
  ) {
    case 'top-left':
      return {
        top: topValue,
        left: `${edge}px`,
        right: 'auto',
        bottom: 'auto'
      }


    case 'bottom-right':
      return {
        top: 'auto',
        left: 'auto',
        right: `${edge}px`,
        bottom: bottomValue
      }


    case 'bottom-left':
      return {
        top: 'auto',
        left: `${edge}px`,
        right: 'auto',
        bottom: bottomValue
      }


    case 'top-right':
    default:
      return {
        top: topValue,
        left: 'auto',
        right: `${edge}px`,
        bottom: 'auto'
      }
  }
}


export default function FloatingReminder({
  type = 'morning',

  text =
    'أذكار الصباح بانتظارك',

  progress = null,

  visible = true,

  draggable = true,

  showCloseButton = true,

  height = 34,

  opacity = 96,

  defaultPosition =
    'top-right',

  stackOffset = 0,

  positionStorageKey =
    'refqat-floating-reminder-position',

  onOpen,

  onClose
}) {
  const reminderRef =
    useRef(null)


  const dragRef =
    useRef({
      dragging: false,
      moved: false,

      startX: 0,
      startY: 0,

      startLeft: 0,
      startTop: 0
    })


  const [
    position,
    setPosition
  ] =
    useState(() => {
      try {
        const saved =
          JSON.parse(
            localStorage.getItem(
              positionStorageKey
            )
          )


        if (
          Number.isFinite(
            saved?.x
          ) &&
          Number.isFinite(
            saved?.y
          )
        ) {
          return {
            x: saved.x,
            y: saved.y
          }
        }
      } catch {
        // ignore
      }


      return null
    })


  /* =====================================
     SAVE POSITION
  ===================================== */

  useEffect(() => {
    if (!position) {
      return
    }


    localStorage.setItem(
      positionStorageKey,

      JSON.stringify(
        position
      )
    )
  }, [
    position,
    positionStorageKey
  ])


  /* =====================================
     KEEP INSIDE SCREEN
  ===================================== */

  useEffect(() => {
    function keepInsideScreen() {
      const element =
        reminderRef.current


      if (!element) {
        return
      }


      setPosition(
        previous => {
          if (!previous) {
            return previous
          }


          const maxX =
            Math.max(
              8,

              window.innerWidth -
              element.offsetWidth -
              8
            )


          const maxY =
            Math.max(
              8,

              window.innerHeight -
              element.offsetHeight -
              8
            )


          return {
            x:
              clamp(
                previous.x,
                8,
                maxX
              ),

            y:
              clamp(
                previous.y,
                8,
                maxY
              )
          }
        }
      )
    }


    window.addEventListener(
      'resize',
      keepInsideScreen
    )


    window.addEventListener(
      'orientationchange',
      keepInsideScreen
    )


    return () => {
      window.removeEventListener(
        'resize',
        keepInsideScreen
      )


      window.removeEventListener(
        'orientationchange',
        keepInsideScreen
      )
    }
  }, [])


  if (
    !visible ||
    typeof document ===
      'undefined'
  ) {
    return null
  }


  /* =====================================
     DRAG START
  ===================================== */

  function handlePointerDown(
    event
  ) {
    if (
      event.target.closest(
        '.floating-reminder-close'
      )
    ) {
      return
    }


    if (!draggable) {
      return
    }


    const element =
      reminderRef.current


    if (!element) {
      return
    }


    const rect =
      element
        .getBoundingClientRect()


    dragRef.current = {
      dragging: true,
      moved: false,

      startX:
        event.clientX,

      startY:
        event.clientY,

      startLeft:
        rect.left,

      startTop:
        rect.top
    }


    element
      .setPointerCapture?.(
        event.pointerId
      )
  }


  /* =====================================
     DRAG MOVE
  ===================================== */

  function handlePointerMove(
    event
  ) {
    if (
      !draggable ||
      !dragRef.current
        .dragging
    ) {
      return
    }


    const element =
      reminderRef.current


    if (!element) {
      return
    }


    const deltaX =
      event.clientX -
      dragRef.current.startX


    const deltaY =
      event.clientY -
      dragRef.current.startY


    if (
      Math.abs(deltaX) > 3 ||
      Math.abs(deltaY) > 3
    ) {
      dragRef.current.moved =
        true
    }


    const maxX =
      Math.max(
        8,

        window.innerWidth -
        element.offsetWidth -
        8
      )


    const maxY =
      Math.max(
        8,

        window.innerHeight -
        element.offsetHeight -
        8
      )


    setPosition({
      x:
        clamp(
          dragRef.current
            .startLeft +
            deltaX,

          8,
          maxX
        ),

      y:
        clamp(
          dragRef.current
            .startTop +
            deltaY,

          8,
          maxY
        )
    })
  }


  /* =====================================
     DRAG END / CLICK
  ===================================== */

  function handlePointerUp(
    event
  ) {
    if (!draggable) {
      onOpen?.()
      return
    }


    const wasMoved =
      dragRef.current.moved


    dragRef.current.dragging =
      false


    reminderRef.current
      ?.releasePointerCapture?.(
        event.pointerId
      )


    if (!wasMoved) {
      onOpen?.()
    }
  }


  /* =====================================
     POSITION
  ===================================== */

  const positionStyle =
    position
      ? {
          top:
            `${position.y}px`,

          left:
            `${position.x}px`,

          right:
            'auto',

          bottom:
            'auto'
        }

      : getDefaultPositionStyle(
          defaultPosition,
          stackOffset
        )


  const style = {
    ...positionStyle,

    /*
      أهم تعديل:
      نضمن أنه فوق الهيدر
      وكل محتويات التطبيق.
    */
    zIndex: 2147483647,

    '--reminder-height':
      `${height}px`,

    '--reminder-opacity':
      opacity / 100
  }


  const reminder = (
    <div
      ref={
        reminderRef
      }

      className={
        `floating-reminder floating-reminder-${type}`
      }

      style={
        style
      }

      onPointerDown={
        handlePointerDown
      }

      onPointerMove={
        handlePointerMove
      }

      onPointerUp={
        handlePointerUp
      }

      onKeyDown={
        event => {
          if (
            event.key ===
              'Enter' ||
            event.key ===
              ' '
          ) {
            event.preventDefault()

            onOpen?.()
          }
        }
      }

      role="button"

      tabIndex={0}
    >
      <div className="floating-reminder-content">

        <span className="floating-reminder-dot" />


        <span className="floating-reminder-text">
          {text}
        </span>


        {progress !== null && (
          <span className="floating-reminder-progress">
            {progress}%
          </span>
        )}

      </div>


      {showCloseButton && (
        <button
          type="button"

          className="floating-reminder-close"

          aria-label="إخفاء التذكير"

          onPointerDown={
            event =>
              event.stopPropagation()
          }

          onClick={
            event => {
              event.stopPropagation()

              onClose?.()
            }
          }
        >
          ×
        </button>
      )}

    </div>
  )


  /*
    Portal:
    الشريط لم يعد داخل main-content
    أو تحت الهيدر.

    يُرسم مباشرة داخل body
    ولذلك يبقى أعلى التطبيق كله.
  */

  return createPortal(
    reminder,
    document.body
  )
}