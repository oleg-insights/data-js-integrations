/**
   * Разделитель между названием товара 
   * и его параметрами в корзине
   */
   const titleDivider  = '<br><br>'

/**
 * Разделитель между параметрами в корзине
 * Один параметр = имя поля и его значение
 */
  const paramsDivider = {special: ' >> ', original: ' >> '}

/**
 * Разделитель между разными вариантами
 * одного поля в корзине
 * 
 * Например, поля "Галочки" или "Галочки с картинками"
 */
  const objectDivider = '/'

/**
 * Обозначение переноса строки
 * в многострочном тексте в корзине
 */
  const stringDivider = ' &crarr; '

  const priceClassName = 'ptc-price'
  const ignoreClassName = 'ptc-ignore'

  const generalTypes = {
    'string-falsy': ['name', 'phone', 'email', 'text', 'textarea', 'hidden', 'radio-list', 'radio-visual', 'select-menu'],
    'number-zero' : ['count', 'result', 'slider'],
    'object'      : ['checkbox-list', 'checkbox-visual'],
    'boolean'     : ['checkbox-input', 'privacy-checkbox']
  }

setItemsInfo()

cr.api(page => {
  page.cart.on('item-add', setItemsInfo)
  
  page.waitForAppear('[data-item].ptc-card', card => {
    const dataItem = getDataItem(card)
    const itemname = getItemName(dataItem)
    const forms = card.querySelectorAll('.cr-form')

    if (!forms.length) {
      const modalButtons = card.querySelectorAll('button[data-action="modal"]')

      if (!modalButtons.length) return

      const cardModals = [...modalButtons].map(button => {
        const widget = button.closest('.widget')
        const modal = widget.querySelector('.modal')
        const uid = modal.dataset.uid

        return { card, button, uid }
      })

      return page.on('popup-show', e => {
        const popup = e.popup.el
        const popupUid = popup.dataset.uid
        const modalInfo = cardModals.find(cardModal => {
          return cardModal.uid == popupUid
        })

        if (!modalInfo) return

        const forms = popup.querySelectorAll('.cr-form')

        if (!forms.length) return
        
        forms.forEach(form => exec(popup, form))
      })
    }

    forms.forEach(form => exec(card, form))

    function exec(parent, form) {
      const fields = form.querySelectorAll('.cr-field')

      if (!fields.length) return

      setDataItem(form, fields, itemname)

      fields.forEach(field => {
        page.getComponent(field).on('change', () => setDataItem(form, fields, itemname))

        field.addEventListener('keypress', pressE => {
          if (pressE.key != 'Enter') return
          page.getComponent(form).on('before-submit', addToCartOnSubmit)
        })
      })

      const cartButtons = parent.querySelectorAll('[data-action="addtocart"]')
      const fieldCleanButtons = form.querySelectorAll('[cr-field_clean]')

      cartButtons.forEach(button => {
        button.addEventListener('click', addToCartOnPress)
      })

      fieldCleanButtons.forEach(button => {
        const field = button.closest('.cr-field')
        button.addEventListener('click', () => {
          page.getComponent(field).setValue('')
          setDataItem(form, fields, itemname)
        })
      })
    }

    /**
     * ---------------
     * FUNCTIONS (A-Z)
     * ---------------
     */

    function addToCart(dataItem) {
      const title = getItemProperty(card, dataItem, 'title')
      const price = getItemProperty(card, dataItem, 'price')
      const image = getItemProperty(card, dataItem, 'photo')
      
      page.cart.addItem({ title, price, image })
      creatium.msg_success(creatium.l10n("Добавлено в корзину!"), null, {
        button: creatium.l10n("ОК"), content: {
          element: "a", attributes: {
            href: "/cart", innerText: creatium.l10n("Открыть корзину")
          }
        }
      })
    }

    function addToCartOnPress(e) {
      e.stopPropagation()
      addToCart(dataItem)
      e.target.removeEventListener('click', addToCartOnPress)
    }
    
    function addToCartOnSubmit(e) {
      e.prevent()
      addToCart(dataItem)
      page.getComponent(form).off('before-submit', addToCartOnSubmit)
    }

    function getCardParams(fields) {
      let params = []
      fields.forEach(field => {
        const apiField = page.getComponent(field)
        const generalType  = getGeneralType(field)
        const value = getValue(field, generalType)
        value || value === 0 
          ? params.push(stylizeParam(apiField.name, value)) 
          : false
      })
      return params
    }

    function getDataItem(card) {
      let dataItem = card.dataset.item
      try {dataItem = JSON.parse(dataItem)}
      catch(e) {}
      return dataItem
    }

    function getFieldVals(field) {
      const metahtml = field.querySelector('.metahtml')
      return JSON.parse(metahtml.dataset.vals)
    }

    function getFilteredFields(fields) {
      return [...fields].filter(field => {
        return !field.classList.contains(ignoreClassName)
          && !field.classList.contains(priceClassName)
      })
    }

    function getGeneralType(field) {
      const fieldVals = getFieldVals(field)

      let generalType = false
      
      Object.keys(generalTypes).forEach(key => {
        if (generalType) return
        generalTypes[key].includes(fieldVals.type) ? generalType = key : false
      })

      return generalType ? generalType : fieldVals.type
    }

    function getHackableString(object) {
      let string = ''
      Object.keys(object).forEach(key => {
        const divider = string ? objectDivider : ''
        string += `${divider}${key}: ${object[key]}`
      })
      return string || false
    }

    function getItemName(dataItem) {
      if (typeof dataItem === 'string') return dataItem
      return dataItem.find(prop => prop.type == 'title').value
    }

    function getItemProperty(card, dataItem, property) {
      if (typeof dataItem === 'object') return dataItem.find(prop => prop.type == property).value

      const datasetProperty = `item${property[0].toUpperCase()}${property.substr(1)}`

      const value = property === 'title'
        ? card.dataset.item
        : card.dataset[datasetProperty]
      
      return value
    }

    function getValue(field, type) {
      const apiField = page.getComponent(field)
      switch(type) {
        case 'string-falsy':
          return getValueByString(apiField.value)
        case 'number-zero':
          return apiField.value
        case 'object':
          return getValueByObject(apiField.value)
        case 'boolean':
          return apiField.value ? 'Да' : 'Нет'
        case 'file':
          return getValueByFile(field)
        case 'hackable':
          return getValueByHackable(field, apiField.value)
      }
    }

    function getPriceField(fields) {
      return [...fields].find(field => {
        return field.classList.contains(priceClassName)
      })
    }

    function getValueByFile(field) {
      const value = page.getComponent(field).value
      const link = value ? value[0] : ''
      return link
    }

    function getValueByHackable(field, value) {
      const typing = getFieldVals(field).typing
      return typing == 'string' ? 
        value || false : typing == 'number' ? 
          value || 0 : getHackableString(value)
    }

    function getValueByObject(object) {
      let string = ''
      Object.keys(object).forEach(key => {
        if (!object[key]) return
        const divider = string ? objectDivider : ''
        string += divider + key
      })
      return string || false
    }

    function getValueByString(string) {
      const divider = stringDivider || '\n'
      return string ? string.replace(/\n/g, divider) : false
    }

    function setCardParams(filteredFields) {
      if (!filteredFields) return
      
      const params = getCardParams(filteredFields)
      const title  = stylizeTitle(itemname, params)

      if (typeof dataItem === 'string') return card.dataset.item = title

      const titleProp = dataItem.find(prop => prop.type == 'title')

      titleProp.value = title
    }
    
    function setCardPrice(priceField) {
      if (!priceField) return
      
      let priceValue = ''
        
      const calcValueNode = priceField.querySelector('[cr-field-result]')

      if (calcValueNode) {
        priceValue = calcValueNode.textContent
      }
      else {
        const apiField = page.getComponent(priceField)

        if (!apiField || !apiField.value) return

        priceValue = apiField.value
      }

      if (!priceValue) return

      if (typeof dataItem === 'string') return card.dataset.itemPrice = priceValue

      const priceProp = dataItem.find(prop => prop.type == 'price')
      priceProp.value = priceValue
    }
    
    function setDataItem(form, fields, itemname) {    
      const filteredFields = getFilteredFields(fields)
      const priceField = getPriceField(fields)

      setCardParams(filteredFields)
      setCardPrice(priceField)

      if (typeof dataItem === 'string') return

      card.dataset.item = JSON.stringify(dataItem)
    }

    function stylizeParam(name, value) {
      return `${name}: ${value}`
    }
    
    function stylizeTitle(itemname, params) {
      if (!params.length) return itemname

      params = `${paramsDivider.special}${params.join(paramsDivider.special)}`

      return `${itemname}${params}`
    }
  })

  window.addEventListener('storage', () => {
    cr.cart.list = JSON.parse(localStorage.getItem('cart'))
  })
})

function getNameDefaultParams(arr) {
  if (!arr.length) return ''

  const paramsWrapperStyle = `style="` +
    `display: inline-block;` +
    `width: 100%;` +
    `text-align: left;` +
    `padding-left: 0px;` +
    `word-break: break-word` +
    `"`

  let params = ''
  arr.forEach(param => {
    const key = param.replace(/:\s.+$/, '')
    const value = param.replace(/^.+?:(\s.+)$/, '$1').replace(/http(?:s)?:\/\/.+\/([^/]+)$/, '$1')
    
    params += params ? '<br>' : ''
    params += `<b>- ${key}</b>: ${value}`
  })

  params = `<span ${paramsWrapperStyle}">${params}</span>`

  return `${titleDivider}${params}`
}

function waitFor(selector, callback) {
  const n = setInterval(() => {
    const elems = document.querySelectorAll(selector)

    if (!elems.length) return

    elems.forEach(elem => callback(elem))
    clearInterval(n)
  }, 100)
}

function setItemsInfo() {
  if (location.pathname !== '/cart') return

  waitFor('[data-role="itemname"]', nameElDefault => {
    if (nameElDefault.pretty) return

    const nameDefault = nameElDefault.textContent.trim()
    const nameDefaultArr = nameDefault.split(paramsDivider.original)
    const goodsname = nameDefaultArr.shift()
    const params = getNameDefaultParams(nameDefaultArr)
    const nameCustom = `${goodsname}${params}`

    nameElDefault.innerHTML = nameCustom
    nameElDefault.pretty = true
  })
}
