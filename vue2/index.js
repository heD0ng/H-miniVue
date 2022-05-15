function isObject(obj) {

    return obj && typeof obj === 'object'
}

var that = null
class MiniVue {
    constructor(options = {}) {
        this.$options = options
        this.$el = typeof options.el === 'string' ? document.querySelector(options.el) : options.el
        this.$data = options.data
        this.$methods = options.methods
        // this.$computed = options.computed

        this.proxyData(this.$data)
        
        that = this
        const computedIns = this.initComputed(this, options.computed)
        this.$computed = computedIns.update.bind(computedIns)

        const watcherIns = this.initWatch(this,options.watch)
        this.$watch = watcherIns.invoke.bind(watcherIns)
        new Observer(this.$data)
        new Compiler(this)
        console.log(this)
    }

    proxyData(data) {
        if (isObject(data)) {
            for (const key in data) {
                Object.defineProperty(this, key, {
                    get() {
                        return data[key]
                    },
                    set(newVal) {
                        if (data[key] == newVal) return
                        this.$data[key] = newVal
                    }
                })
            }
        }
    }

    initComputed(vm, computed) {
        const computedIns = new Computed()

        for (let key in computed) {
            computedIns.addComputed(vm, computed, key)
        }
        return computedIns
    }
    initWatch(vm, watch) {
        const watcherIns = new Watcher()

        for (let key in watch) {
            watcherIns.addWatcher(vm,watch,key)
        }
        return watcherIns
    }
}

class Computed {
    constructor() {
        /**
         * {
         *      key:total,
         *      value: 3,
         *      get: total fn
         *      dep:[a,count]
         * }
         * 
         */
        this.computedData = []
    }
    addComputed(vm, computed, key) {
        const descriptor = Object.getOwnPropertyDescriptor(computed, key)
        const descriptorFn = descriptor.value.get ? descriptor.value.get : descriptor.value
        let value = descriptorFn.call(vm)
        let get = descriptorFn.bind(vm)
        const dep = this._collectDep(descriptorFn)
        console.log(dep)
        this._pushComputedDep({
            key,
            value,
            get,
            dep
        })
        console.log(this.computedData)

        const dataItem = this.computedData.find(item => item.key === key)

        Object.defineProperty(vm, key, {
            get() {
                console.log(dataItem.value)
                return dataItem.value
            },
            set() {
                dataItem.value = dataItem.get()
            }
        })
    }

    update(key, cb) {
        this.computedData.map((item) => {
            const { dep } = item
            const flag = dep.find(el => el === key)
            console.log(flag)
            if (flag) {
                item.value = item.get()
                cb && cb(key, item.value)
            }
        })
        console.log(this.computedData)
    }

    _collectDep(fn) {
        const matched = fn.toString().match(/this\.([^\s]+)/g);
        console.log(matched)
        return matched.map(item => item.split('.')[1])
    }
    _pushComputedDep(itemComputedDep) {
        this.computedData.push(itemComputedDep)
    }
}


class Dep {
    constructor() {
        this.deps = new Set()
    }
    add(dep) {
        if (dep && dep.update) {
            this.deps.add(dep)
        }

    }
    notify() {
        this.deps.forEach(dep => dep.update && dep.update())
    }
}

class Observer {
    constructor(data) {
        if (Array.isArray(data)) {
            observeArr(data)
        } else {
            this.walk(data)
        }
    }
    walk(data) {
        if (!isObject(data)) return
        Object.keys(data).map((key) => defineReactive(data, key, data[key]))
    }

}
function defineReactive(data, key, value) {
    new Observer(value)
    const dep = new Dep()
    Object.defineProperty(data, key, {
        get() {
            Dep.target && dep.add(Dep.target)
            return value
        },
        set(newVal) {
            if (newVal == data[key]) return
            value = newVal
            that.$computed(key)
            new Observer(newVal)
            dep.notify()
        }
    })
}

class Watch {
    constructor(vm, key, cb) {
        this.vm = vm
        this.key = key
        this.cb = cb

        Dep.target = this
        // 保存旧值
        this.old = vm[key]
        Dep.target = null
    }
    update() {
        const value = this.vm[this.key]
        // 判断新值与旧值
        if (value == this.old) return
        this.cb(value)
        // 将新值赋给旧值
        this.old = value
    }
}

class Compiler {
    constructor(vm) {
        this.vm = vm
        this.methods = vm.$methods
        // let childNodes = vm.$el.childNodes
        this.compile(vm.$el)
    }
    compile(el) {
        let childNodes = el.childNodes
        Array.from(childNodes).forEach((node) => {
            if (isTextNode(node)) {
                this.createTextNode(node)
            } else if (isElementNode(node)) {
                this.createElementNode(node)
            }
            // 递归
            if (node.childNodes && node.childNodes.length) {
                this.compile(node)
            }
        })

    }
    createTextNode(node) {
        const reg = /\{\{(.+?)\}\}/
        const nodeVal = node.textContent
        if (reg.test(nodeVal)) {
            const key = reg.exec(nodeVal)[1].trim()
            node.textContent = this.vm[key]
            new Watch(this.vm, key, (newVal) => {
                node.textContent = newVal

            })
        }
    }
    createElementNode(node) {
        const attrs = node.attributes
        if (attrs.length) {
            Array.from(attrs).forEach(attribute => {
                
                const attr = attribute.name
                const value = attribute.value
                // id = 'app' =>  value: 'app'; attr : id
                if (isOrder(attr)) {
                    // v-text v-model v-on:click
                    const attrType = attr.indexOf(':') > -1 ? attr.slice(5) : attr.slice(2)


                    this.update(node, attrType, value)
                }
            })
        }
    }
    update(node, attrType, key) {
        switch (attrType) {
            case 'text':
                node.textContent = this.vm[key]
                new Watch(this.vm, key, (newVal) => {
                    node.textContent = newVal
                })
                break;
            case 'model':
                // 输入框：双向数据绑定
                node.value = this.vm[key]
                new Watch(this.vm, key, (newVal) => {
                    node.value = newVal
                })
                node.addEventListener('input', () => {
                    this.vm[key] = node.value
                })
                break;
            case 'click':
                node.addEventListener('click', this.methods[key].bind(this.vm))
                break;

            default:
                break;
        }
    }
}
// 文本节点类型：3
function isTextNode(node) {
    return node.nodeType === 3
}
// 文本节点类型：1
function isElementNode(node) {
    return node.nodeType === 1
}

// 判断是否为v-指令
function isOrder(attr) {
    return attr.startsWith('v-')
}

class Watcher{
    /**
     * addWatcher(vm,watcher,key,options)
     */
    constructor(){
        this.watchers = []
    }
    addWatcher(vm,watch,key){
        this.pushWatcher({
            key,
            fn:watch[key].bind(vm)
        })
    }
    pushWatcher(watch){
        this.watchers.push(watch)
    }
    invoke(key,newVal,oldVal){
        this.watchers.map((item)=>{
            if(item.key === key){
                item.fn(newVal,oldVal)
            }
        })
    }
}