// how to do...
// multiple returns from producer
// conditional returns from producer
// how to write conditional for sliding costs
//
// are costs for the next 1 producer cached so buy functions can access them through world?

const c = React.createElement;

class Runner{
    constructor(world = null){
        this.world = world;
        if(world == null){
            this.world = new World();
        }
        this.time_resolution = .25; //1/60; //.01;
        this.resource_components = [];
        this.goal_components = [];
    }
    world_step(){
        var startTime = new Date().getTime();
        //unlock any locked goals
        for(var goal of this.world.locked_goals){
            if(this.world.is_goal_unlockable(goal)){
                //console.log(`moving goal ${goal.name} to available`);
                this.world.move_goal(goal, this.world.locked_goals, this.world.available_goals);
            }
        }

        //accumulate resources
        for(const [key, value] of Object.entries(this.world.resources)){
            if(!(value instanceof Producer)){
                continue;
            }

            if(value.yield_type in this.world.resources){ //don't add the key if it doesn't exist so that other outputs can be unlocked eventually
                this.world.resources[value.yield_type].count += value.yield_function(this.world) * value.yield_base * value.count;
            }
        }

        //evaluate any buy conditions
        for(const [key,value] of Object.entries(this.world.resources)){
            if(!(value instanceof Producer)){
                continue;
            }
            // console.log(value.buy_conditional(this.world));
            // console.log(this.can_buy(key));
            try{
                while(value.buy_conditional(this.world) && this.world.can_buy(key)){
                    this.world.buy(key, 1, true);
                }
            }
            catch(err){

            }
            
        }

        this.render_resources();
        this.render_goals();

        var duration = new Date().getTime() - startTime;
        var remaining = this.time_resolution - (duration/1000);
        //console.log(`remaining: ${remaining}`);

    }
    render_goals(){
        for(var goal of this.goal_components){
            goal();
        }
    }
    render_resources(){
        for(var resource of this.resource_components){
            resource();
        }
    }
    run(){
        window.setInterval(this.world_step.bind(this), this.time_resolution * 1000);
    }
    add_goal_component(goal){
        this.goal_components.push(goal);
    }
    add_resource_component(resource){
        this.resource_components.push(resource);
    }

}

class World{
    constructor(resources = {}, locked_goals = [], available_goals = [], completed_goals = []){
        this.resources = resources;
        this.locked_goals = locked_goals;
        this.available_goals = available_goals;
        this.completed_goals = completed_goals;
        this.variable_reference = {}; //used for parsing varaibles in condition fields
        this.generate_variable_reference(); //used for parsing varaibles in condition fields
    }
    generate_variable_reference(){
        for(const [key,value] of Object.entries(this.resources)){
            this.variable_reference[value.variable_name] = key;
        }
    }
    can_buy(producer_name, quantity = 1){
        if(!(producer_name in this.resources)){
            return false;
        }
        var producer_target = this.resources[producer_name];
        var cost = producer_target.get_cost(this, quantity);
        return this.resources[producer_target.cost_type].count >= cost;
    }
    buy(producer_name, quantity = 1, bypass_buycheck = false){
        //only use bypass_buycheck if can_buy has been used right before the function in code. 
        //it's an optimization to avoid double-calling
        if(bypass_buycheck || this.can_buy(producer_name, quanitity)){
            var producer_target = this.resources[producer_name];
            var cost = producer_target.get_cost(this, quantity);
            this.resources[producer_target.cost_type].count -= cost;
            producer_target.count += quantity;
            return true;
        }        
        return false;
    }
    get_cost(producer_name, quantity = 1){
        if(!(producer_name in this.resources)){
            return 0;
        }
        return this.resources[producer_name].get_cost(this, quantity);
    }
    can_afford_goal(target_goal){
        for(const [resource, quantity] of Object.entries(target_goal.resource_costs)){
            if (this.resources[resource].count < quantity){
                //console.log(`can't afford goal: ${resource} x ${this.resources[resource].count} < ${quantity}`);
                return false;
            }
        }
        return true;
    }
    get_goal_by_name(goal_name, category){
        return category.find((goal) => {return goal_name == goal.name;});
        // if(category == 'available'){
        //     return this.world.available_goals.find((goal) => {return goal_name == goal.name;});
        // }
        // else if (category == 'locked'){
        //     return this.world.locked_goals.find((goal) => {return goal_name == goal.name;});
        // } else{
        //     return this.world.completed_goals.find((goal) => {return goal_name == goal.name;});
        // }
    }
    move_goal(target_goal, from_category, to_category){
        var target_index = from_category.findIndex((x) => {return x.name == target_goal.name;})
        from_category.splice(target_index,1);
        to_category.push(target_goal);
    }
    complete_goal(goal_name, bypass_buycheck = false){
        var target_goal = this.get_goal_by_name(goal_name, this.available_goals);
        if(target_goal == undefined){
            return false;
        }
        if(bypass_buycheck || this.can_afford_goal(target_goal)){
            for(const [resource, quantity] of Object.entries(target_goal.resource_costs)){
                this.resources[resource].count -= quantity
            }
            this.move_goal(target_goal, this.available_goals, this.completed_goals);
            for(const [resource, quantity] of Object.entries(target_goal.resource_outputs)){
                this.resources[resource].enabled = true;
                this.resources[resource].count += quantity;
            }
        }
    }
    is_goal_unlockable(target_goal){
        for(var goal_dependency of target_goal.goal_dependencies){
            if(this.get_goal_by_name(goal_dependency, this.completed_goals) == undefined){
                return false;
            }
        }
        for(const [resource, quantity] of Object.entries(target_goal.resource_dependencies)){
            if(this.resources[resource].count < quantity){
                // console.log(`not enough ${resource} for ${target_goal.name}`);
                return false;
            }
        }
        return true;
    }
    is_goal_available(target_goal){
        return this.get_goal_by_name(target_goal.name, this.available_goals) != undefined;
    }
    is_resource_enabled(name){
        return (name in this.resources) && this.resources[name].enabled;
    }
}

class Goal{
    constructor(name, resource_dependencies = {}, goal_dependencies = [], resource_costs = {}, resource_outputs = {}){
        this.name = name;
        this.resource_dependencies = resource_dependencies;
        this.goal_dependencies = goal_dependencies;
        this.resource_costs = resource_costs;
        this.resource_outputs = resource_outputs;
    }
}

class Resource{
    constructor(type, count = 0, variable_name){
        this.type = type;
        this.count = count;
        this.variable_name = variable_name;
        this.enabled = false;
    }
}

class Producer extends Resource{
    constructor(type, count = 0, variable_name, cost_type, cost_base, yield_type, yield_base, 
        buy_conditional = (world) => {return false;},
        yield_function = (world) => {return 1;},
        cost_function = (base_cost, count, world) => {return base_cost;}        
        ){
        super(type, count, variable_name);
        this.cost_type = cost_type;
        this.cost_base = cost_base;
        this.yield_type = yield_type;
        this.yield_base = yield_base;
        this.buy_conditional = buy_conditional;
        this.yield_function = yield_function;
        this.cost_function = cost_function;
    }
    parse_buy_conditional(condition_string, world){//TODO
        //evalue condition string for haxors TODO
        // check everything with _COST is a producer
        // BASIC_PRODUCER_COST < 30
        
        if(condition_string == ''){
            this.buy_conditional = (world) => {return false;};
            return true;
        }
        var operators = ['>', '<', '>=', '<=', '==', '&&', '||'];
        var contains_operator = false;
        for(var operator of operators){
            if(condition_string.includes(operator)){
                contains_operator = true;
                break;
            }
        }
        if(!contains_operator){
            this.buy_conditional = (world) => {return false;};
            return true;
        }


        var replacements  = {
            'COST': `world.get_cost(${this.type})`
        };

        // for(const [key,value] of Object.entries(world.resources)){
        //     var f = new Function(`${value.variable_name} = ${value.count}`);
        // }
        
        var parts = condition_string.split(' ');

        for(var i = 0; i < parts.length; i++){
            var part = parts[i];
            if(part.endsWith('_COST')){
                parts[i] = 'world.get_cost(\'' + part.replace('_COST','') + '\')';
            }
            else if (part in world.variable_reference){
                parts[i] = 'world.resources[\'' + part + '\'].count';
            }
            for(const [key,value] of Object.entries(world.variable_reference)){
                if(parts[i].includes(key)){
                    parts[i] = parts[i].replace(key, value);
                    break;
                }
            }
        }
        var together = parts.join(' ');
        try{
            console.log(together);
            var f = new Function('world', 'return (' + together + ');');
            this.buy_conditional = f;
        }
        catch(err){
            return false;
        }


        return true;
    }
    get_cost(world, quantity){
        var cost = 0;
        for(var i = 0; i < quantity; i++){
            cost += this.cost_function(this.cost_base, this.count + i, world);
        }
        return cost;
    }
}

class ProducerGroup extends React.Component{
    constructor(props){
        super(props);
        this.state = {
            producer: props.producer,
            world: props.world,
            condition_string: '',
        };

        this.handleChange = this.handleChange.bind(this);
        this.handleSubmit = this.handleSubmit.bind(this);

        this.on_add_render_listener = props.on_add_render_listener;
    }
    render(){
        return c('div', {className: this.state.producer.enabled ? 'producer_group': 'hidden'},
            c('label', {className: 'producer_group_label'}, this.state.producer.type + ' x' + this.state.producer.count),
            c('button', {className: 'producer_group_button', 
                onClick: this.handleSubmit, 
                disabled:!this.state.world.can_buy(this.state.producer.type)}, 
                this.state.producer.get_cost(this.state.world, 1) + this.state.producer.cost_type),
            c('input', {className: 'producer_group_text', onChange: this.handleChange, value: this.state.condition_string}, null)
        );
    }
    handleChange(e){
        this.setState({condition_string: e.target.value});
        this.state.producer.parse_buy_conditional(e.target.value, this.state.world);
    }
    handleSubmit(e){
        //this.setState(state => ({cost_per: state.cost_per * 2, count: state.count + 1}));
        if(this.state.world.can_buy(this.state.producer.type, 1)){
            this.state.world.buy(this.state.producer.type, 1, true);
        }
    }
    componentDidMount(){
        this.on_add_render_listener(() => {this.forceUpdate();});
    }
}

class ResourceGroup extends React.Component{
    constructor(props){
        super(props);
        this.state = {
            resource: props.resource,
        };
        this.on_add_render_listener = props.on_add_render_listener;
    }
    render(){
        return c('div', {className: this.state.resource.enabled ? 'resource_group': 'hidden'}, 
                    c('label', {className: 'resource_group_label'}, this.state.resource.type + ': ' + this.state.resource.count)
                );
    }
    componentDidMount(){
        this.on_add_render_listener(() => {this.forceUpdate();});
    }
}

class GoalGroup extends React.Component{
    constructor(props){
        super(props);
        this.state = {
            goal: props.goal,
            world: props.world,
        };
        this.on_add_render_listener = props.on_add_render_listener;
        this.handleSubmit = this.handleSubmit.bind(this);
    }
    render(){
        return c('div', {className: this.state.world.is_goal_available(this.state.goal) ? 'goal_group' : 'hidden'},
                    c('button', {className: 'goal_group_button', 
                        onClick: this.handleSubmit,
                        disabled: !this.state.world.can_afford_goal(this.state.goal)}, `${this.state.goal.name} : ${JSON.stringify(this.state.goal.resource_costs)}`)
                )
    }
    handleSubmit(e){
        if(this.state.world.can_afford_goal(this.state.goal)){
            this.state.world.complete_goal(this.state.goal.name, true);
        }
    }

    componentDidMount(){
        this.on_add_render_listener(() => {this.forceUpdate();});
    }
}

function producer_from_obj(obj){
    var producer = new Producer(obj.name, 0, obj.variable_name, obj.cost_type, obj.cost_base, obj.output_type, obj.output_quantity,
        (world) => {return false;}, //buy condition
        new Function('world', obj.yield_function),
        new Function('base_cost', 'count', 'world', obj.cost_function),
    );
    if('quantity' in obj){
        producer.count = obj.quantity;
    }
    if('enabled' in obj){
        producer.enabled = obj.enabled;
    }
    return producer;
}

function resource_from_obj(obj){
    var resource = new Resource(obj.name, 0, obj.variable_name);
    if('quantity' in obj){
        resource.count = obj.quantity;
    }
    if('enabled' in obj){
        resource.enabled = obj.enabled;
    }
    return resource;
}

function goal_from_obj(obj){
    return new Goal(obj.name, obj.resource_dependencies, obj.goal_dependencies, obj.resource_costs, obj.resource_outputs);
}

data_str = `{
    "goals":[
        {
            "name": "tab_producer",
            "resource_dependencies": {
                "units": 50
            },
            "goal_dependencies":[],
            "resource_costs":{
                "units" : 100
            },
            "resource_outputs":{
                "tab_producer": 0,
                "tabs": 0
            }
        },
        {
            "name": "producer_producer",
            "resource_dependencies":{
                "units": 500,
                "unit_producer": 15
            },
            "goal_dependencies": ["tab_producer"],
            "resource_costs":{
                "unit_producer": 10
            },
            "resource_outputs":{
                "producer_producer" : 0
            }
        }
    ],
    "producers":[
        {
            "name": "unit_producer",
            "variable_name": "UNIT_PRODUCER",
            "output_type": "units",
            "output_quantity": 1,
            "yield_function": "return 1;",
            "cost_type": "units",
            "cost_base": 10,
            "cost_function": "return Math.floor(base_cost * Math.pow(1.1, count-1));",
            "enabled": true,
            "quantity": 1
        },
        {
            "name": "tab_producer",
            "variable_name": "TAB_PRODUCER",
            "output_type": "tabs",
            "output_quantity": 1,
            "yield_function": "return 1;",
            "cost_type": "units",
            "cost_base": 100,
            "cost_function": "return Math.floor(base_cost * Math.pow(1.1, count-1));",
            "enabled": false
        },
        {
            "name": "producer_producer",
            "variable_name": "PRODUCER_PRODUCER",
            "output_type": "unit_producer",
            "output_quantity": 1,
            "yield_function": "return 1;",
            "cost_type": "tabs",
            "cost_base": 100,
            "cost_function": "return Math.floor(base_cost * Math.pow(1.1, count-1));",
            "enabled": false
        }
    ],
    "resources":[
        {
            "name": "units",
            "variable_name": "UNITS",
            "quantity": 97,
            "enabled": true
        },
        {
            "name": "tabs",
            "variable_name": "TABS",
            "quantity": 0,
            "enabled": false
        }
    ]
}`


function load_game_from_string(str){
    var data = JSON.parse(str);
    var producers_to_render = [];
    var resources_to_render = [];
    var goals_to_render = [];

    var resources = {};
    var locked_goals = [];
    var available_goals = [];
    var completed_goals = [];

    for(var producer_obj of data.producers){
        var producer = producer_from_obj(producer_obj);
        resources[producer.type] = producer;
        producers_to_render.push(producer);
    }
    for(var resource_obj of data.resources){
        var resource = resource_from_obj(resource_obj);
        resources[resource.type] = resource;
        resources_to_render.push(resource);
    }
    for(var goal_obj of data.goals){
        var goal = goal_from_obj(goal_obj);
        goals_to_render.push(goal);
        if('state' in goal_obj){
            if(goal_obj.state == 'completed'){
                completed_goals.push(goal);
            }else if (goal_obj.state == 'available'){
                available_goals.push(goal);
            }else{
                locked_goals.push(goal);
            }
        }else{
            locked_goals.push(goal);
        }
    }

    var world = new World(resources, locked_goals, available_goals, completed_goals);

    var runner = new Runner(world);

    for(var producer of producers_to_render){
        var producer_g = c(ProducerGroup, {producer: producer, world: world, on_add_render_listener: runner.add_resource_component.bind(runner)});
        ReactDOM.render(producer_g, document.querySelector(`#producer_group_${producer.type}`));
    }
    for(var resource of resources_to_render){
        var resource_g = c(ResourceGroup, {resource: resource, on_add_render_listener: runner.add_resource_component.bind(runner)});
        ReactDOM.render(resource_g, document.querySelector(`#resource_group_${resource.type}`));
    }
    for(var goal of goals_to_render){
        var goal_g = c(GoalGroup, {goal: goal, world: world, on_add_render_listener: runner.add_resource_component.bind(runner)});
        ReactDOM.render(goal_g, document.querySelector(`#goal_group_${goal.name}`));
    }
    runner.run();
}

load_game_from_string(data_str);


/*
BASIC_PRODUCER_COST < BASIC_PRODUCER_2_COST
BASIC_PRODUCER_COST > BASIC_PRODUCER_2_COST

*/