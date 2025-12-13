cr.api(page => {
  /**
   * Цели для передачи в GA, через запятую
   */
  const gaGoals = [
    {category: 'order', action: 'callback'}, 
    {category: 'order2', action: 'callback2'}
  ]


  gaGoals.forEach(goal => {
    page.waitForAppear(`.ga-${goal.action}`, elem => {
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
    gtag('event', goal.action, {
      'eventCategory': goal.category,
      'event_callback': () => {
        console.log(`ga action: ${goal.action}, ga category ${goal.category}`)
      }
    })
  }
})
