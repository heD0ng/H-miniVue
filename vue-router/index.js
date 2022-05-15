class VueRouter {
    constructor(options){
        this._path = new Vue({
            data:{
                state: '/'
            }
        });
        // Vue.util.defineReactive(this, 'current', '/');
        this.routes = options.routes
        this.mode = options.mode || 'hash'
        this.init()
    }
    get current(){
        return this._path._data.state;
    }
    init(){
        if(this.mode == 'hash'){
            window.addEventListener('load',()=>{
                this.current = window.location.pathname.slice(1)
            })
            
            window.addEventListener('hashchange', ()=>{
                this.current = window.location.pathname.slice(1)
            })
        }
    }
}

VueRouter.install = function(Vue){

    Vue.mixin({
        beforeCreate(){
            if (this.$options.router) {
                Vue.prototype.$router = this.$options.router;
            }
        }
    })

    Vue.component('router-link',{
        props: {
            to: {
                type: String,
                require: true
            }
        },
        render(h){

            return h('a', {attrs:{
                href: '#' + this.to
            }}, this.$slots.default)
        }
    })
    Vue.component('router-view',{
        render(h){
            const path = this.$router.current
            const routes = this.$router.routes
            const item = routes.find(item => item.path == path)
            return h(item.component);
        }
    })
}