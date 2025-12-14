cr.api(page => {
  const gm = '_ga', y = '_ym_uid'
  const mid = {gm, y}

  Object.keys(mid).forEach(key => {
    mid[key] = document.cookie.match(new RegExp(`(?:^|[^\w])${mid[key]}=(.*?)(?:;|$)`))
    mid[key] = mid[key] ? decodeURIComponent(mid[key][1]) : undefined
  })
  
  mid.gm = mid.gm ? mid.gm.replace(/[^\.]+\.[^\.]+\.(\d+\.\d)/, '$1') : mid.gm

  page.waitForAppear('.cr-form', form => {
    page.getComponent(form).on('before-submit', e => {
      e.fields.push({
        name: 'Client ID by Google', value: mid.gm, uid: 'Client ID by Google'
      }, {
        name: 'ymclid_metrika', value: mid.y, uid: 'ymclid_metrika'
      })
    })
  })
})
