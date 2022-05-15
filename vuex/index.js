
// var Vue = null
class Store{
    constructor(options){
        this._vm = new Vue({
            data:{
                $$state:options.state
            }
        })
        this._actions = options.actions
        this._mutations = options.mutations
        this.getter = {}

        this.dispatch = this.dispatch.bind(this)
        this.commit = this.commit.bind(this)
        options.getter && this.handleGetters(options.getter)
    }
    handleGetters(getter){
        Object.keys(getter).map(item=>{
            Object.defineProperty(this.getter,item,{
                get: () => {
                    return getter[item](this.state)
                }
            })
        })
    }
    get state(){
        return this._vm._data.$$state
    }
    dispatch(type, payload){
        const action = this._actions[type]
        if(action){
            action(this,payload)
        }
    }
    commit(type, payload){
        const mutation = this._mutations[type]
        if(mutation){
            mutation(this.state,payload)
        }
    }
}


const install = (_) => {
    // Vue = _;
    Vue.mixin({
        beforeCreate() {
            if(this.$options.store){
                Vue.prototype.$store = this.$options.store
            }
        }
    })
}
const Vuex = {
    Store, 
    install
}