/* src/modules/CustomerSegmentation/composables/useCounterAnimation.ts */

import { ref, watch } from 'vue'

/**
 * Anima un número desde un valor anterior hasta el nuevo.
 * Usa easing easeOutCubic para que se sienta natural.
 *
 * @param getValue  - función que devuelve el valor numérico actual
 * @param duration  - duración de la animación en ms (default 700)
 */
export function useCounterAnimation(
   getValue: () => number,
   duration = 700
) {
   const displayed = ref(getValue())
   let rafId: number | null = null
   let startTime: number | null = null
   let from = 0
   let to = 0

   const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3)

   const animate = (timestamp: number) => {
      if (startTime === null) startTime = timestamp
      const elapsed = timestamp - startTime
      const progress = Math.min(elapsed / duration, 1)
      const eased = easeOutCubic(progress)

      displayed.value = Math.round(from + (to - from) * eased)

      if (progress < 1) {
         rafId = requestAnimationFrame(animate)
      } else {
         displayed.value = to
         rafId = null
         startTime = null
      }
   }

   watch(getValue, (newVal) => {
      if (rafId !== null) {
         cancelAnimationFrame(rafId)
         rafId = null
      }
      from = displayed.value
      to = newVal
      startTime = null
      rafId = requestAnimationFrame(animate)
   })

   return { displayed }
}