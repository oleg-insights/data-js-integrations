cr.api(page => {
  const gaGoals = ['click', 'order', 'follow'] /* Действия целей, через запятую */

  gaGoals.forEach(goal => {
    page.waitForAppear(`.ga-${goal}`, elem => {
      const sendButton = elem.querySelector('button[data-action="send"]')
      const form = sendButton ? elem.closest('.cr-form') : false

      if (sendButton && form) {
        page.getComponent(form).on('submit', () => {
          sendGAEvent(goal)
        })
      }
      else {
        elem.addEventListener('click', () => {
          sendGAEvent(goal)
        })
      }
    })
  })

  function sendGAEvent(goal) {
    gtag('event', goal, {
      'event_callback': () => {
        console.log(`ga action: ${goal}`)
      }
    })
  }
})
