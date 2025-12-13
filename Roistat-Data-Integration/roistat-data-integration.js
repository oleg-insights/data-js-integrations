class CRRoistatUtils
{
    url = {
        getParams() {
            const params = {}
            const couples = window.location.search.substr(1).split('&')
            couples.forEach(couple => {
                if (/^[^=]+?=[^=]+$/.test(couple)) {
                    const matches = couple.match(/^(.+?)=(.+)$/)
                    const key = decodeURI(matches[1])
                    const value = decodeURI(matches[2])
                    params[key] = value
                }
            })
            return params
        },
        devideParams(params) {
            const utm = {}
            if (!utils.isEmpty(params)) {
                for (let key in params) {
                    if (/^utm_/.test(key)) utm[key] = params[key]
                    else params['GET ' + key] = params[key]
                    delete params[key]
                }
            }
            return {getParams: params, utmParams: utm}
        }
    }
    cart = {
        getProducts() {
            const cart  = page.cart
            const items = cart.items

            if ( !items.length ) return

            const products = {}
            const subtotal = cart.subtotal

            let currency = ''
            items.forEach((item, i) => {
                const price = utils.cart.devidePrice(item.price)
                const totalprice = price.amount * item.quantity
                const key        = items.length > 1 ? `Заказ ${i + 1}` : 'Заказ'

                currency      = currency ? currency : price.currency
                products[key] = `${item.title} = ${totalprice} ${currency} (${price.amount} * ${item.quantity})`
            })
            products['Общая сумма'] = `${subtotal} ${currency}`
            return products
        },
        devidePrice(price) {
            price = price.replace(',', '.').replace(/[^\d\s\.a-zA-Zа-яА-ЯЁё]/g, '')
            const matches  = price.match(/([\d\.\s]+)(\D+)?$/)
            const amount   = matches[1] ? +matches[1].replace(/\s/g, '') : 0
            const currency = matches[2] ? matches[2].replace(/[\s\.]/g, '') : ''
            return {amount, currency}
        }
    }
    card = {
        getProduct(form) {
            let itemname = utils.card.getProductParam(form, 'title')
            let itemprice = utils.card.getProductParam(form, 'price')
            itemname  = itemname && itemname.trim()  ? itemname  : 'Название не указано'
            itemprice = itemprice && itemprice.trim() ? itemprice : 'Цена не указана'

            return {
                'Заказ': `${itemname} = ${itemprice}`,
                'Общая сумма': itemprice
            }
        },
        getProductParam(form, type) {
            const productCard = form.closest('[data-item]')
            const dataItem = JSON.parse( productCard.dataset('item') )
            const prop = dataItem.find(item => item.type == value)

            return prop && prop.value.trim() ? prop.value : false
        }
    }
    cookie = {
        getItem(name) {
            name = name.replace(/([.$\/?*+\\{}|()\[\]^])/g, '\\$1')
            const regex = new RegExp('(?:^|[^\w])' + name + '=(.*?)(?:;|$)')
            const matches = document.cookie.match(regex)
            return matches ? decodeURIComponent(matches[1]) : undefined
        },
        getClientIdByGoogle() {
            let cid = utils.cookie.getItem('_ga')
            /* GA1.2.1426066414.1596276565 → 1426066414.1596276565 */
            cid = cid ? cid.replace(/[^\.]+\.[^\.]+\.(\d+\.\d)/, '$1') : cid
            return cid ? {'Client ID by Google': cid} : {}
        }
    }
    isEmpty(obj) {
        for (let key in obj) {
            return key || obj[key] ? false : true
        }
    }
}

const utils = new CRRoistatUtils

class CRRoistatUser
{
    constructor() {
        this._regEvents([
            {id: 'page-view', name: 'Посетитель открыл сайт'}, 
            {id: 'link-follow', name: 'Переход по ссылке'},
            {id: 'modal-open', name: 'Открыто окно'},
            {id: 'add-to-cart', name: 'Добавлено в корзину'},
            {id: 'form-change', name: 'Кто-то начал заполнять форму'}, 
            {id: 'form-submit-success', name: 'Заявка отправлена'}, 
            {id: 'old-form-submit', name: 'Отправка устаревшей формы'}
        ])
    }
    _regEvents(eList) {
        this.events = eList.map(e => {
            e.event = new Event(e.id)
            return e
        })
    }
    on(eventId, handler)  {
        const eventItem = this.events.find(event => event.id == eventId)

        if (!eventItem || !eventItem.event instanceof Event) {
            integration.msg('not-registered-event', {eventId})
        } else {
            document.addEventListener(eventItem.id, () => {
                eventItem.params ? handler(eventItem.params) : handler()
            })
        }

        return this
    }
    trigger(eventId, params = null) {
        const eventItem = this.events.find(event => event.id == eventId)

        if (!eventItem) {
            integration.msg('not-registered-event', {eventId})
        } else {
            eventItem.params = params
            document.dispatchEvent(eventItem.event)
        }
    }
}

class CRRoistatIntegration
{
    constructor() {
        this.debug = this._getDebugMode()
        this.apiURL = 'https://cloud.roistat.com/'
    }
    _getDebugMode() {
        const couples = window.location.search.substr(1).split('&');
        const couple  = couples.find(couple => {
            return /^r_debug=\d+$/.test(couple)
        })

        if (!couple) return 0

        return +couple.replace(/^r_debug=(\d+)$/, '$1')
    }
    log(event, data = null, type = 'success') {
        if (!this.debug) return
        
        const bg = type == 'fail' 
            ? 'crimson' : type == 'warn' 
            ? '#ff5318' : type == 'ready'
            ? '#03c03c' : '#2589ff'

        const params = `color: white; background-color: ${bg}; font-size: 18px; line-height: 30px`
        const name = '%c Roistat CR Integration '

        let msg = event
        
        data && typeof data == 'object' ? console.log(name, params, msg, data) : console.log(name, params, msg)
    }
    msg(event, data = null) {
        switch (event) {
            case 'wait-for-ready':
                this.log('Ожидание готовности интеграции...', null, 'warn')
                break;
            case 'dom-loaded':
                this.log('DOM-дерево загружено', null, 'warn')
                break;
            case 'module-load-success':
                this.log('Модули Roistat успешно загружены', null, 'warn')
                break;
            case 'modules-load-fail':
                this.log('Модули Roistat не загружены, ждем еще 3 секунды...', null, 'fail')
                break;
            case 'no-modules-check-blocking':
                this.log('Нет модулей Roistat, проверяем блокировку запросов браузером...', null, 'fail')
                break;
            case 'blocked-by-extention':
                this.log('Запросы блокируются одним из расширений браузера. Нужно отключить все расширения и, включая по одному, найти проблемное, чаще всего причина в блокировщике рекламы', null, 'fail')
                break;
            case 'incorrect-roistat-code-or-account-status':
                this.log('Неверно подключен код Roistat или аккаунт в Roistat уже неактивен, обратитесь в поддержку Roistat', null, 'fail')
                break;
            case 'integration-ready':
                this.log('Интеграция готова к работе, ошибок нет', null, 'ready')
                break;
            case 'old-redactor-version':
                this.log('Версия редактора этого сайта устарела, интеграция не будет передавать данные, обратитесь в поддержку Creatium', null, 'fail')
                break;
            case 'old-form-submit':
                this.log('Данные из этой формы не будут переданы в Roistat, так как она устарела, ее следует заменить на новую в редакторе', null,'fail')
                break;
            case 'no-data-item-title':
                this.log('Событие "Добавлено в корзину" не передано в Roistat - отсутствует название товара', null, 'fail')
                break;
            case 'no-data-item-price':
                this.log('Событие "Добавлено в корзину" не передано в Roistat - отсутствует стоимость товара', null, 'fail')
                break;
            case 'not-registered-event':
                this.log(`События "${data.eventId}" не существует`, null, 'fail')
                break;
            case 'event-send-success':
                this.log(`Событие "${data.eventName}" успешно передано в Roistat`, data.eventData)    
                break;
            default:
                break;
        }
    }
    sendEvent(eventId, data = null) {
        const eventItem = user.events.find(event => event.id == eventId)
        if (!eventItem) {
            this.msg('not-registered-event', {eventId})
        } else {
            roistat.event.send(eventItem.name, data)
            this.msg('event-send-success', {eventName: eventItem.name, eventData: data})
        }
    }
    sendForm(formName, formData) {
        roistatGoal.reach(formData)
        this.log(`Таблица данных, переданных в Roistat при отправке формы "${formName}":`)
        console.table(formData)
    }
    waitForRoistatResponse() {
        return new Promise((resolve, reject) => {
            fetch(this.apiURL, {mode: 'no-cors'})
                .then(() => resolve())
                .catch(() => reject())
        })
    }
    waitForRoistatModules() {
        return new Promise(resolve => { 
            let i = 0
            let failLogged = false
            let waitForModules = setInterval(() => {
                if (i >= 2000 && !failLogged) {
                    this.msg('modules-load-fail')
                    failLogged = true
                } else if (i >= 5000) {
                    this.msg('no-modules-check-blocking')
                    this.waitForRoistatResponse()
                        .then(() => this.msg('incorrect-roistat-code-or-account-status'))
                        .catch(() => this.msg('blocked-by-extention'))

                    clearInterval(waitForModules)
                }
                i += 1000
            }, 1000)
            window.onRoistatAllModulesLoaded = () => {
                this.msg('module-load-success')
                clearInterval(waitForModules)
                resolve()
            } 
        })
    }
    waitForDOM() {
        return new Promise(resolve => {
            document.addEventListener('DOMContentLoaded', () => {
                this.msg('dom-loaded'), resolve()
            })
        })
    }
    waitForReady() {
        this.msg('wait-for-ready')
        return Promise.all([
            this.waitForDOM(),
            this.waitForRoistatModules()
        ])
    }
}

class CRRoistatForm
{
    constructor(crApiForm) {
        this.el = crApiForm.el
        this.crApiForm = crApiForm
        this.isCartPageForm = location.pathname == '/cart'
        this.isProductCardForm = Boolean(this.el.closest('[data-item]'))
    }
    getLeadName() {
        const crApiForm = this.crApiForm
        if ( this.isCartPageForm ) {
            return 'Отправлена форма в корзине'
        }
        else if ( this.isProductCardForm ) {
            let itemname = utils.card.getProductParam('title')
            let itemprice = utils.card.getProductParam('price')
            itemname  = itemname && itemname.trim()  ? itemname  : 'Название не указано'
            itemprice = itemprice && itemprice.trim() ? itemprice : 'Цена не указана'

            return `Отправлена форма в карточке товара "${itemname}" (${itemprice})`
        }
        else {
            return `Отправлена форма: "${crApiForm.name}"`
        }
    }
    getExtFields() {
        const crApiForm = this.crApiForm
        const crApiExtFields = crApiForm.fields.filter(field => {
            return !field.type
        })

        if (!crApiExtFields) return ''

        const data = {}
        crApiExtFields.forEach(field => {
            if (!field.value) return

            const string = this.getStringByValue(field.value)
            string || string === 0 
                ? data[field.name] = string
                : false
        })
        return data
    }
    getStringByValue(crApiValue) {
        if ( Array.isArray(crApiValue) )
            return this.getFileNameByArray(crApiValue)
        else if ( typeof crApiValue == 'object' )  
            return this.getStringByObject(crApiValue)
        else if ( typeof crApiValue == 'boolean' ) 
            return this.getStringByBoolean(crApiValue)
        else return crApiValue
    }
    getFileNameByArray(crApiValue) {
        return crApiValue[0]
            ? crApiValue[0].replace(/.+\/([^\/]+)$/, '$1')
            : false
    }
    getStringByObject(crApiValue) {
        let string = ''
        for (let key in crApiValue) {
            if (crApiValue[key]) {
                string = string ? string + ', ' + key : key
            }
        }
        return string
    }
    getStringByBoolean(crApiValue) {
        return crApiValue ? 'Да' : 'Нет'
    }
    getFieldValue(type) {
        const crApiForm = this.crApiForm
        const crApiField = crApiForm.fields.find(field => {
            return field.type == type
        })
        if (!crApiField || !crApiField.value || !crApiField.value.trim()) return 'Не указано'
        return crApiField.value.trim()
    }
    getFullData() {
        const getParams = utils.url.getParams()
        const dividedParams = utils.url.devideParams(getParams)
        const comment = this.getExtFields()
        const formData = {
            leadName: this.getLeadName(),
            text: 'Страница: ' + location.hostname + location.pathname, 
            name: this.getFieldValue('name'),
            email: this.getFieldValue('email'),
            phone: this.getFieldValue('phone'),
            fields: { 
                push(object) {
                    if (!utils.isEmpty(object)) {
                        for (let key in object) this[key] = object[key]
                    }
                }
            }
        }

        this.isCartPageForm 
            ? formData.fields.push(utils.cart.getProducts()) 
            : this.isProductCardForm
                ? formData.fields.push(utils.card.getProduct(this.el))
                : false
        
        formData.fields.push(comment)
        formData.fields.push(dividedParams.getParams)
        formData.fields.push(dividedParams.utmParams)
        formData.fields.push({roistat_visit: roistat.visit})
        formData.fields.push(utils.cookie.getClientIdByGoogle())
        
        delete formData.fields.push

        return formData
    }
}

const user = new CRRoistatUser
const integration = new CRRoistatIntegration

integration.waitForReady().then(() => {
    if (cr && !cr.api) {
        integration.msg('old-redactor-version')
        return
    }
    
    integration.msg('integration-ready')
    
    cr.api(page => {
        user.trigger('page-view')

        page.on('popup-show', e => {
            user.trigger('modal-open', {modalId: e.popup.id})
        })

        page.waitForAppear('a', link => {
            link.addEventListener('click', e => {
                const isSelfHost = link.href.hostname == location.hostname
                const isSelfPath = link.href.pathname == location.pathname
                if ( !isSelfHost || !isSelfPath ) {
                    user.trigger('link-follow', {link: link.href.replace(/http(s)?:\/\//, '')})
                }
            })
        })

        page.waitForAppear('.cr-form', form => {
            const crApiForm = page.getComponent(form)

            form = new CRRoistatForm(crApiForm)

            form.el.addEventListener('change', () => {
                if (form.el.isChanged) return
                user.trigger('form-change', {formName: crApiForm ? crApiForm.name : 'Неизвестно'})
                form.el.isChanged = true
            })

            crApiForm.on('submit', e => {
                const formData = form.getFullData()
                user.trigger('form-submit-success', {formName: crApiForm.name, formData})
            })
        })

        page.waitForAppear('[data-form]', form => {
            if (!form.classList.contains('cr-form')) {
                $(form).on('submit', function() {
                    user.trigger('old-form-submit')
                })
            }
        })

        page.waitForAppear('.widget-element[data-item] [data-action="addtocart"]', button => {
            button.addEventListener('click', () => {
                const card = button.closest('[data-item]')
                const data = JSON.parse(card.dataset.item)
                const titleObj = data.find(obj => obj.type == 'title')
                const priceObj = data.find(obj => obj.type == 'price')

                if (!titleObj) {
                    integration.msg('no-data-item-title')
                    return
                } else if (!priceObj) {
                    integration.msg('no-data-item-price')
                    return
                } else {
                    const title = titleObj.value
                    const price = priceObj.value

                    user.trigger('add-to-cart', {title, price})
                }
            })
        })
    })
})

user.on('page-view', e => {
    integration.sendEvent('page-view', {
        url: location.href
    })
})
user.on('link-follow', e => {
    integration.sendEvent('link-follow', {
        'Ссылка': e.link,
        'Страница': location.pathname
    })
})
user.on('modal-open', e => {
    integration.sendEvent('modal-open', {
        'ID окна': e.modalId,
        'Страница': location.pathname
    })
})
user.on('add-to-cart', e => {
    integration.sendEvent('add-to-cart', {
        'Товар': e.title,
        'Стоимость': e.price, 
        'Страница': location.pathname
    })
})
user.on('form-change', e => {
    integration.sendEvent('form-change',  {
        'Имя формы': e.formName,
        'Страница': location.pathname
    })
})
user.on('form-submit-success', e => {
    integration.sendEvent('form-submit-success', {
        'Имя формы': e.formName,
        'Страница': location.pathname
    })
    integration.sendForm(e.formName, e.formData)
})
user.on('old-form-submit', () => {
    integration.msg('old-form-submit')
})
