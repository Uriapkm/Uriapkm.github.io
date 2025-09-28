/*  Dungeon of the Arcane Depths – BUG-FIXED EDITION
    ------------------------------------------------
    All classes are wrapped in an IIFE to avoid leaking globals.
    The file is ready to be dropped into index.html.
*/

(() => {
/* ------------------------------------------------------------------
   0.  Early helper (moved before any class uses it)
------------------------------------------------------------------ */
function createAsciiTexture(symbol, color) {
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx    = canvas.getContext('2d');
    ctx.fillStyle = '#000';  ctx.fillRect(0, 0, 64, 64);
    ctx.font      = 'bold 48px Courier New';
    ctx.fillStyle = `rgb(${color[0]},${color[1]},${color[2]})`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(symbol, 32, 32);
    return new THREE.CanvasTexture(canvas);
}

/* ------------------------------------------------------------------
   1.  Configuration
------------------------------------------------------------------ */
const CONFIG = {
    MAP_WIDTH: 30,  MAP_HEIGHT: 20,
    ROOM_MAX_SIZE: 8, ROOM_MIN_SIZE: 4,
    MAX_ROOMS: 10,  MAX_LEVELS: 10,
    FLEE_CHANCE: 0.3,
    COLORS: {
        player:[255,255,255], wall:[0,0,255], floor:[128,128,128],
        exit:[255,255,0], enemy:[255,0,0], potion:[0,255,0],
        rare_potion:[255,0,255], key:[255,255,0], altar:[0,255,255],
        glyph:[0,255,255], text:[0,255,0]
    },
    ATTACK_POOL: [
        ["Slash",15,0.9], ["Fireball",25,0.7], ["Ice Shard",20,0.8],
        ["Lightning Bolt",30,0.6], ["Punch",10,0.95], ["Kick",12,0.85],
        ["Bite",8,1.0], ["Headbutt",14,0.75], ["Energy Blast",35,0.5],
        ["Poison Dart",18,0.8], ["Holy Strike",20,0.85], ["Shadow Strike",18,0.9],
        ["Thunder Slash",22,0.75], ["Frostbite",20,0.85], ["Blaze Kick",25,0.7]
    ],
    ENEMY_SYMBOLS: ['g','o','t','d'],  BOSS_SYMBOL: 'A',
    CONTEMPLATIONS: [
        "The air smells of myrrh and yesterday's regrets.",
        "A mirror-lined corridor reflects every promise you broke.",
        "Wind reshapes the walls; the stone forgets faster than you.",
        "You step on broken glass that once was your certainty.",
        "The torchlight flickers in Morse: 'Whom do you trust at midnight?'",
        "A choir sings in a language you almost remember from before birth.",
        "The floor warms under bare feet—like coals, like conviction.",
        "Behind the next door: the laugh you used to disguise as courage."
    ]
};

/* ------------------------------------------------------------------
   2.  Global state
------------------------------------------------------------------ */
const gameState = {
    currentScreen: 'frontPage',
    gameState: 'playing',   // playing | combat | gameOver | victory
    currentLevel: 1,
    player: null,
    gameMap: null,
    entities: [],
    items: [],
    currentEnemy: null,
    messageLog: ["Welcome, adventurer! Press 'q' to quit.", "You see a path forward. Find the exit!"],
    scene: null, camera: null, renderer: null, controls: null, asciiTexture: null,
    gameLogic: null
};

/* ------------------------------------------------------------------
   3.  Entity hierarchy
------------------------------------------------------------------ */
class Entity {
    constructor(x,y,symbol,name,hp,atk,def){
        this.x=x; this.y=y; this.symbol=symbol; this.name=name;
        this.max_hp=hp; this.hp=hp; this.attack=atk; this.defense=def;
        this.attacks=[]; this.status_effects=[]; this.mesh=null;
    }
    is_alive(){return this.hp>0;}
    move(dx,dy){
        this.x+=dx; this.y+=dy;
        if(this.mesh) this.mesh.position.set(this.x,0,this.y);
    }
    apply_status_effects(){
        const msgs=[];
        const remove=[];
        for(const ef of this.status_effects){
            const [typ,turns,val]=ef;
            if(typ==='poison'||typ==='burn'){
                const old=this.hp;
                this.hp=Math.max(1,this.hp-val);
                msgs.push(`${this.name} suffers ${old-this.hp} damage from ${typ}!`);
            }
            ef[1]--;
            if(ef[1]<=0) remove.push(ef);
        }
        for(const r of remove) {
            const i=this.status_effects.indexOf(r);
            if(i>-1) this.status_effects.splice(i,1);
        }
        return msgs;
    }
}

class Player extends Entity {
    constructor(x,y){
        const hp =Math.floor(Math.random()*31)+30;
        const atk=Math.floor(Math.random()*21)+20;
        const def=Math.max(5,100-hp-atk);
        super(x,y,'@','Player',hp,atk,def);
        this.level=1; this.exp=0; this.exp_to_level=10;
        this.inventory={potions:0,rare_potions:0,key:false};
        this.attacks=this.getRandomAttacks(4);
        this.attack_repeat=[0,0,0,0];
    }
    getRandomAttacks(n){
        const pool=[...CONFIG.ATTACK_POOL].sort(()=>Math.random()-0.5);
        return pool.slice(0,n);
    }
    createMesh(scene){
        const geo =new THREE.BoxGeometry(0.8,1,0.8);
        const mat =new THREE.MeshBasicMaterial({color:new THREE.Color(1,1,1),transparent:true,opacity:0.8});
        this.mesh=new THREE.Mesh(geo,mat);
        this.mesh.position.set(this.x,0.5,this.y);
        const textPlane=new THREE.Mesh(
            new THREE.PlaneGeometry(0.6,0.6),
            new THREE.MeshBasicMaterial({map:createAsciiTexture(this.symbol,CONFIG.COLORS.player),transparent:true,side:THREE.DoubleSide})
        );
        textPlane.position.set(0,1,0); textPlane.rotation.x=-Math.PI/2;
        this.mesh.add(textPlane);
        scene.add(this.mesh);
    }
    add_exp(amt){
        this.exp+=amt;
        let hu=0,au=0,du=0,na=null;
        while(this.exp>=this.exp_to_level){
            const [h,a,d,n]=this.level_up();
            hu+=h; au+=a; du+=d; if(n) na=n;
        }
        return [hu,au,du,na];
    }
    level_up(){
        this.level++; this.exp-=this.exp_to_level; this.exp_to_level=Math.floor(this.exp_to_level*1.5);
        const hu=Math.floor(Math.random()*11)+5, au=Math.floor(Math.random()*6)+3, du=Math.floor(Math.random()*6)+3;
        this.max_hp+=hu; this.hp+=hu; this.attack+=au; this.defense+=du;
        this.hp=Math.min(this.max_hp,this.hp+Math.floor(this.max_hp*0.3));
        let na=null;
        if(Math.random()<0.1){
            const pool=CONFIG.ATTACK_POOL.filter(a=>!this.attacks.some(b=>b[0]===a[0]));
            if(pool.length) na=pool[Math.floor(Math.random()*pool.length)];
        }
        return [hu,au,du,na];
    }
}

class Enemy extends Entity {
    constructor(x,y,symbol,name,level,is_elite=false,is_boss=false){
        level=Math.max(1,level);
        let hp=30+level*10, atk=28+level*4, def=level;
        hp+=Math.floor(Math.random()*7)-3; atk+=Math.floor(Math.random()*6)-3; def+=Math.floor(Math.random()*3);
        if(is_elite){ hp=Math.floor(hp*4); atk=Math.floor(atk*2); def=Math.floor(def*1); symbol=symbol.toUpperCase(); name=`Elite ${name}`; }
        if(is_boss){  hp=Math.floor(hp*6); atk=Math.floor(atk*4); def=Math.floor(def*2); symbol='A'; name="Archdragon"; }
        super(x,y,symbol,name,hp,atk,def);
        this.level=level; this.is_elite=is_elite; this.is_boss=is_boss;
        this.setupAttacks();
    }
    setupAttacks(){
        const t=this.symbol.toLowerCase();
        if(this.is_boss){
            this.attacks.push(["Dragon's Wrath",30+this.level*3,0.7],["Inferno Blast",25+this.level*2,0.65]);
        }else if(t==='g'){ this.attacks.push(["Poison Sting",8+this.level,0.85],["Quick Slash",5+this.level,0.95]); }
        else if(t==='o'){ this.attacks.push(["Brutal Smash",15+this.level*2,0.65],["Club Swing",10+this.level,0.8]); }
        else if(t==='t'){ this.attacks.push(["Heavy Slam",12+this.level,0.75],["Regenerate",0,1.0]); }
        else if(t==='d'){ this.attacks.push(["Fire Breath",15+this.level*2,0.7],["Claw Strike",10+this.level,0.8]); }
        for(let i=0;i<Math.min(this.level,2);i++){
            const pwr=Math.floor(Math.random()*(10+this.level*2-5+1))+5;
            const acc=Math.max(0.5,0.9-this.level*0.05);
            this.attacks.push([`${this.name} Special ${i+1}`,pwr,acc]);
        }
    }
    createMesh(scene){
        const geo=new THREE.BoxGeometry(0.8,1,0.8);
        const col=this.is_boss?new THREE.Color(1,0,0):this.is_elite?new THREE.Color(1,0.5,0):new THREE.Color(1,0,0);
        const mat=new THREE.MeshBasicMaterial({color:col,transparent:true,opacity:0.8});
        this.mesh=new THREE.Mesh(geo,mat);
        this.mesh.position.set(this.x,0.5,this.y);
        const textPlane=new THREE.Mesh(
            new THREE.PlaneGeometry(0.6,0.6),
            new THREE.MeshBasicMaterial({map:createAsciiTexture(this.symbol,CONFIG.COLORS.enemy),transparent:true,side:THREE.DoubleSide})
        );
        textPlane.position.set(0,1,0); textPlane.rotation.x=-Math.PI/2;
        this.mesh.add(textPlane);
        scene.add(this.mesh);
    }
}

/* ------------------------------------------------------------------
   4.  Items
------------------------------------------------------------------ */
class Item {
    constructor(x,y,symbol,name){this.x=x; this.y=y; this.symbol=symbol; this.name=name; this.mesh=null;}
    createMesh(scene){
        const geo=new THREE.PlaneGeometry(0.6,0.6);
        let col;
        if(this.symbol==='!') col=CONFIG.COLORS.potion;
        else if(this.symbol==='*') col=CONFIG.COLORS.rare_potion;
        else if(this.symbol==='k') col=CONFIG.COLORS.key;
        else if(this.symbol==='%') col=CONFIG.COLORS.altar;
        else col=CONFIG.COLORS.glyph;
        const mat=new THREE.MeshBasicMaterial({map:createAsciiTexture(this.symbol,col),transparent:true,side:THREE.DoubleSide});
        this.mesh=new THREE.Mesh(geo,mat);
        this.mesh.position.set(this.x,0.5,this.y); this.mesh.rotation.x=-Math.PI/2;
        scene.add(this.mesh);
    }
}
class Potion extends Item {
    constructor(x,y){super(x,y,'!','Health Potion');}
    use(pl){ const heal=Math.floor(pl.max_hp/2); pl.hp=Math.min(pl.max_hp,pl.hp+heal); return heal; }
}
class RarePotion extends Item {
    constructor(x,y){super(x,y,'*','Rare Potion');}
    use(pl){ pl.attack_repeat=[0,0,0,0]; return "Attack accuracies restored!"; }
}
class Key extends Item {
    constructor(x,y){super(x,y,'k','Dungeon Key');}
}
class Altar extends Item {
    constructor(x,y){super(x,y,'%','Mysterious Altar');}
    use(pl){
        if(Math.random()<0.5){
            const stat=['hp','attack','defense'][Math.floor(Math.random()*3)];
            if(stat==='hp'){ pl.max_hp+=15; pl.hp=Math.min(pl.max_hp,pl.hp+15); return ["+15 HP!",null]; }
            if(stat==='attack'){ pl.attack+=8; return ["+8 ATK!",null]; }
            pl.defense+=8; return ["+8 DEF!",null];
        }else{
            return ["A sacred technique is offered!",["Divine Wrath",22,0.8]];
        }
    }
}
class Glyph extends Item {
    constructor(x,y){super(x,y,'¤','Mystic Glyph');}
}

/* ------------------------------------------------------------------
   5.  Map
------------------------------------------------------------------ */
class Rect {
    constructor(x,y,w,h){this.x1=x; this.y1=y; this.x2=x+w; this.y2=y+h;}
    center(){return [Math.floor((this.x1+this.x2)/2),Math.floor((this.y1+this.y2)/2)];}
    intersect(o){return this.x1<=o.x2&&this.x2>=o.x1&&this.y1<=o.y2&&this.y2>=o.y1;}
}

class GameMap {
    constructor(w,h){
        this.width=w; this.height=h;
        this.tiles=[]; this.rooms=[]; this.exits=[]; this.meshes=[];
        for(let x=0;x<w;x++){
            this.tiles[x]=[];
            for(let y=0;y<h;y++) this.tiles[x][y]={blocked:true, explored:false, block_sight:true};
        }
    }
    create_room(r){
        for(let x=r.x1+1;x<r.x2;x++) for(let y=r.y1+1;y<r.y2;y++){
            this.tiles[x][y].blocked=false; this.tiles[x][y].block_sight=false;
        }
    }
    create_ht(x1,x2,y){ for(let x=Math.min(x1,x2);x<=Math.max(x1,x2);x++){ this.tiles[x][y].blocked=false; this.tiles[x][y].block_sight=false; } }
    create_vt(y1,y2,x){ for(let y=Math.min(y1,y2);y<=Math.max(y1,y2);y++){ this.tiles[x][y].blocked=false; this.tiles[x][y].block_sight=false; } }
    make_map(max_rooms,rmin,rmax,mw,mh,pl){
        const rooms=[];
        for(let r=0;r<max_rooms;r++){
            const w=Math.floor(Math.random()*(rmax-rmin+1))+rmin;
            const h=Math.floor(Math.random()*(rmax-rmin+1))+rmin;
            const x=Math.floor(Math.random()*(mw-w-1)), y=Math.floor(Math.random()*(mh-h-1));
            const nr=new Rect(x,y,w,h);
            let failed=false;
            for(const or of rooms) if(nr.intersect(or)){failed=true; break;}
            if(!failed){
                this.create_room(nr);
                const [cx,cy]=nr.center();
                if(rooms.length===0){ pl.x=cx; pl.y=cy; }
                else{
                    const [px,py]=rooms[rooms.length-1].center();
                    if(Math.random()<0.5){ this.create_ht(px,cx,py); this.create_vt(py,cy,cx); }
                    else{ this.create_vt(py,cy,px); this.create_ht(px,cx,cy); }
                }
                rooms.push(nr);
            }
        }
        const last=rooms[rooms.length-1];
        const [ex,ey]=last.center();
        this.exits.push([ex,ey]);
        this.rooms=rooms;
        return rooms;
    }
    is_blocked(x,y){ return x<0||x>=this.width||y<0||y>=this.height||this.tiles[x][y].blocked; }
    render(scene){
        this.meshes.forEach(m=>scene.remove(m)); this.meshes=[];
        for(let x=0;x<this.width;x++) for(let y=0;y<this.height;y++){
            const t=this.tiles[x][y];
            if(!t.explored) continue;
            if(t.blocked){
                const wall=new THREE.Mesh(
                    new THREE.BoxGeometry(1,1,1),
                    new THREE.MeshBasicMaterial({color:new THREE.Color(0,0,1),transparent:true,opacity:0.7})
                );
                wall.position.set(x,0,y);
                const txt=new THREE.Mesh(
                    new THREE.PlaneGeometry(0.8,0.8),
                    new THREE.MeshBasicMaterial({map:createAsciiTexture('#',CONFIG.COLORS.wall),transparent:true,side:THREE.DoubleSide})
                );
                txt.position.set(0,0.5,0); txt.rotation.x=-Math.PI/2;
                wall.add(txt);
                scene.add(wall); this.meshes.push(wall);
            }else{
                const floor=new THREE.Mesh(
                    new THREE.PlaneGeometry(1,1),
                    new THREE.MeshBasicMaterial({color:new THREE.Color(0.5,0.5,0.5),transparent:true,opacity:0.5})
                );
                floor.position.set(x,0,y); floor.rotation.x=-Math.PI/2;
                const txt=new THREE.Mesh(
                    new THREE.PlaneGeometry(0.6,0.6),
                    new THREE.MeshBasicMaterial({map:createAsciiTexture('.',CONFIG.COLORS.floor),transparent:true,side:THREE.DoubleSide})
                );
                txt.position.set(0,0.01,0); txt.rotation.x=-Math.PI/2;
                floor.add(txt);
                scene.add(floor); this.meshes.push(floor);
            }
        }
        for(const [ex,ey] of this.exits){
            if(!this.tiles[ex][ey].explored) continue;
            const e=new THREE.Mesh(
                new THREE.PlaneGeometry(0.8,0.8),
                new THREE.MeshBasicMaterial({map:createAsciiTexture('>',CONFIG.COLORS.exit),transparent:true,side:THREE.DoubleSide})
            );
            e.position.set(ex,0.1,ey); e.rotation.x=-Math.PI/2;
            scene.add(e); this.meshes.push(e);
        }
    }
}

/* ------------------------------------------------------------------
   6.  Combat
------------------------------------------------------------------ */
class CombatSystem {
    constructor(pl,en){ this.player=pl; this.enemy=en; }
    player_attack(idx){
        try{
            if(!this.player.attacks.length) return [0,"No attacks!",false];
            if(idx<0||idx>=this.player.attacks.length) return [0,"Invalid attack!",false];
            const [name,base,acc]=this.player.attacks[idx];
            const rep=this.player.attack_repeat[idx];
            const adj=Math.max(0.1,acc-rep*0.08);
            if(Math.random()>adj) return [0,`You missed with ${name}!`,false];
            this.player.attack_repeat[idx]++;
            let dmg=base+Math.floor(this.player.attack/3);
            dmg=Math.max(1,dmg-Math.floor(this.enemy.defense/3));
            dmg=Math.max(1,Math.floor(dmg*(Math.random()*0.2+0.9)));
            this.enemy.hp=Math.max(0,this.enemy.hp-dmg);
            const dead=!this.enemy.is_alive();
            let msg=`You used ${name} for ${dmg} damage.`;
            if(name==="Poison Dart"&&Math.random()<0.2){ this.enemy.status_effects.push(["poison",3,5]); msg+=` ${this.enemy.name} is poisoned!`; }
            if(name==="Fireball"&&Math.random()<0.5){ this.enemy.status_effects.push(["burn",3,7]); msg+=` ${this.enemy.name} is burning!`; }
            if(dead) msg+=` ${this.enemy.name} defeated!`;
            return [dmg,msg,dead];
        }catch(e){ console.error(e); return [0,"Attack error",false]; }
    }
    enemy_attack(){
        try{
            const [name,base,acc]=this.enemy.attacks[Math.floor(Math.random()*this.enemy.attacks.length)];
            if(Math.random()>acc) return [0,`${this.enemy.name} missed with ${name}.`];
            let dmg=base+Math.floor(this.enemy.level/3);
            dmg=Math.max(1,dmg-Math.floor(this.player.defense/3));
            dmg=Math.max(1,Math.floor(dmg*(Math.random()*0.2+0.9)));
            this.player.hp=Math.max(0,this.player.hp-dmg);
            let msg=`${this.enemy.name} used ${name} for ${dmg} damage.`;
            if(name==="Poison Sting"&&Math.random()<0.3){ this.player.status_effects.push(["poison",3,5]); msg+=" You are poisoned!"; }
            if((name==="Fire Breath"||name==="Inferno Blast")&&Math.random()<0.5){ this.player.status_effects.push(["burn",3,7]); msg+=" You are burning!"; }
            return [dmg,msg];
        }catch(e){ console.error(e); return [0,"Enemy attack error"]; }
    }
    attempt_flee(){
        const ok=Math.random()<CONFIG.FLEE_CHANCE;
        return [ok, ok ? "You fled!" : "Failed to flee!"];
    }
}

/* ------------------------------------------------------------------
   7.  Game logic
------------------------------------------------------------------ */
class GameLogic {
    constructor(gm,pl,en,it){
        this.game_map=gm; this.player=pl; this.entities=en; this.items=it;
        this.entity_map={}; this.item_map={}; this.game_state='playing';
        this.current_enemy=null; this.fov_radius=7; this.current_level=1; this.altar_triggered=false;
        this.update_entity_position(pl,pl.x,pl.y,pl.x,pl.y);
    }
    update_entity_position(en,ox,oy,nx,ny){ delete this.entity_map[`${ox},${oy}`]; this.entity_map[`${nx},${ny}`]=en; }
    update_item_position(it,ox,oy,nx,ny){ delete this.item_map[`${ox},${oy}`]; this.item_map[`${nx},${ny}`]=it; }
    is_occupied(x,y){
        if(this.game_map.is_blocked(x,y)) return true;
        if(x===this.player.x&&y===this.player.y) return true;
        return `${x},${y}` in this.entity_map;
    }
    get_entity_at(x,y){ return this.entity_map[`${x},${y}`]||null; }
    get_item_at(x,y){ return this.item_map[`${x},${y}`]||null; }
    add_message(msg){
        this.messageLog.push(msg);
        if(this.messageLog.length>6) this.messageLog.shift();
        updateMessageLog();
    }
    move_player(dx,dy){
        if(this.game_state!=='playing') return;
        try{
            const nx=this.player.x+dx, ny=this.player.y+dy;
            if(this.game_map.is_blocked(nx,ny)) return;
            const it=this.get_item_at(nx,ny);
            if(it){ this.pick_up_item(it); }
            const en=this.get_entity_at(nx,ny);
            if(en instanceof Enemy){ this.start_combat(en); return; }
            if(gameState.currentLevel<CONFIG.MAX_LEVELS){
                for(const [ex,ey] of this.game_map.exits){
                    if(nx===ex&&ny===ey){
                        if(this.player.inventory.key){ this.add_message("You unlock the exit and descend!"); nextLevel(); }
                        else this.add_message("The exit is locked.  Find a key.");
                        return;
                    }
                }
            }
            const ox=this.player.x, oy=this.player.y;
            this.player.move(dx,dy);
            this.update_entity_position(this.player,ox,oy,nx,ny);
            this.explore_area(nx,ny);
            if(!this.altar_triggered&&Math.random()<0.005) this.trigger_rare_event(nx,ny);
            this.move_entities();
            if(Math.random()<0.001) this.add_message(CONFIG.CONTEMPLATIONS[Math.floor(Math.random()*CONFIG.CONTEMPLATIONS.length)]);
        }catch(e){ console.error(e); this.add_message(`Move error: ${e}`); }
    }
    pick_up_item(it){
        try{
            if(it instanceof Potion){
                this.player.inventory.potions++;
                const i=this.items.indexOf(it); if(i>-1){ this.items.splice(i,1); gameState.scene.remove(it.mesh); }
                delete this.item_map[`${it.x},${it.y}`];
                this.add_message(`Picked up ${it.name}.`);
            }else if(it instanceof RarePotion){
                this.player.inventory.rare_potions++;
                const i=this.items.indexOf(it); if(i>-1){ this.items.splice(i,1); gameState.scene.remove(it.mesh); }
                delete this.item_map[`${it.x},${it.y}`];
                this.add_message(`Picked up ${it.name}.`);
            }else if(it instanceof Key){
                if(this.player.inventory.key){ this.add_message("You already hold the Key."); return; }
                this.player.inventory.key=true;
                const i=this.items.indexOf(it); if(i>-1){ this.items.splice(i,1); gameState.scene.remove(it.mesh); }
                delete this.item_map[`${it.x},${it.y}`];
                this.add_message("You found the dungeon key!");
            }else if(it instanceof Altar){
                const [msg,na]=it.use(this.player);
                const i=this.items.indexOf(it); if(i>-1){ this.items.splice(i,1); gameState.scene.remove(it.mesh); }
                delete this.item_map[`${it.x},${it.y}`];
                this.add_message(`You approach the altar. ${msg}`);
                if(na) this._handle_new_attack(na);
                this.altar_triggered=true;
            }else if(it instanceof Glyph){
                this.player.exp+=10;
                const i=this.items.indexOf(it); if(i>-1){ this.items.splice(i,1); gameState.scene.remove(it.mesh); }
                delete this.item_map[`${it.x},${it.y}`];
                this.add_message("Absorbed a Mystic Glyph (+10 EXP).");
            }
            updateUI();
        }catch(e){ console.error(e); }
    }
    use_potion(){
        if(this.player.inventory.potions<=0){ this.add_message("No potions."); return false; }
        const p=new Potion(0,0); const amt=p.use(this.player);
        this.player.inventory.potions--;
        this.add_message(`Used potion and healed ${amt} HP.`);
        updateUI(); return true;
    }
    use_rare_potion(){
        if(this.player.inventory.rare_potions<=0){ this.add_message("No rare potions."); return false; }
        const p=new RarePotion(0,0); const msg=p.use(this.player);
        this.player.inventory.rare_potions--;
        this.add_message(`Used rare potion! ${msg}`);
        updateCombatActions(); updateUI(); return true;
    }
    start_combat(en){
        this.game_state='combat'; this.current_enemy=en;
        this.add_message(`Combat vs ${en.name}!`);
        for(const m of en.apply_status_effects()) this.add_message(m);
        showCombatPanel();
    }
    end_combat(playerWon){
        this.player.attack_repeat=[0,0,0,0];
        if(playerWon){
            let exp=5*this.current_enemy.level;
            if(this.current_enemy.is_elite){
                exp*=2;
                if(Math.random()<0.5){ this.player.inventory.rare_potions++; this.add_message("Elite dropped a Rare Potion!"); }
            }
            if(this.current_enemy.is_boss){ exp*=3; gameState.gameState='victory'; showVictoryPanel(); }

            const i=this.entities.indexOf(this.current_enemy);
            if(i>-1){ this.entities.splice(i,1); gameState.scene.remove(this.current_enemy.mesh); }
            delete this.entity_map[`${this.current_enemy.x},${this.current_enemy.y}`];

            const [hu,au,du,na]=this.player.add_exp(exp);
            let msg=`Gained ${exp} EXP!`;
            if(hu||au||du) msg+=` (HP+${hu} ATK+${au} DEF+${du})`;
            this.add_message(msg);
            if(na){ if(this._handle_new_attack(na)) this.add_message(`Learned ${na[0]}!`); }
        }else{
            this.add_message("You were defeated...");
            gameState.gameState='gameOver'; showGameOverPanel();
        }
        this.game_state='playing'; this.current_enemy=null; hideCombatPanel(); updateUI();
        this.move_entities(); // spread monsters
    }
    explore_area(cx,cy){
        const r=this.fov_radius;
        for(let x=cx-r;x<=cx+r;x++) for(let y=cy-r;y<=cy+r;y++){
            if(x>=0&&x<this.game_map.width&&y>=0&&y<this.game_map.height&&(x-cx)**2+(y-cy)**2<=r*r) this.game_map.tiles[x][y].explored=true;
        }
        this.game_map.render(gameState.scene);
    }
    trigger_rare_event(x,y){
        if(!this.items.some(it=>it.x===x&&it.y===y)){
            const a=new Altar(x,y); a.createMesh(gameState.scene);
            this.items.push(a); this.item_map[`${x},${y}`]=a;
            this.add_message("A Mysterious Altar appears!");
        }
    }
    populate_map(ne,ni){
        // ENEMIES
        for(let i=0;i<ne;i++){
            const room=this.rooms[Math.floor(Math.random()*this.rooms.length)];
            const x=Math.floor(Math.random()*(room.x2-room.x1-2))+room.x1+1;
            const y=Math.floor(Math.random()*(room.y2-room.y1-2))+room.y1+1;
            if(`${x},${y}` in this.entity_map) continue;
            const lvlRoll=Math.random(), base=this.player.level+this.current_level;
            let lvl=base;
            if(lvlRoll<0.5) lvl=Math.max(1,base-1); else if(lvlRoll<0.8) lvl=base; else if(lvlRoll<0.9) lvl=base+1; else lvl=base+2;
            const elite=Math.random()<0.2&&!this.current_enemy?.is_boss;
            const type=CONFIG.ENEMY_SYMBOLS[Math.floor(Math.random()*CONFIG.ENEMY_SYMBOLS.length)];
            const en=new Enemy(x,y,type,`Lv${lvl} ${this.getEnemyName(type)}`,lvl,elite);
            this.entities.push(en); this.entity_map[`${x},${y}`]=en;
        }
        // BOSS
        if(this.current_level===CONFIG.MAX_LEVELS){
            const room=this.rooms[this.rooms.length-1];
            const x=Math.floor(Math.random()*(room.x2-room.x1-2))+room.x1+1;
            const y=Math.floor(Math.random()*(room.y2-room.y1-2))+room.y1+1;
            if(!(`${x},${y}` in this.entity_map)){
                const boss=new Enemy(x,y,CONFIG.BOSS_SYMBOL,"Archdragon",this.player.level+5,false,true);
                this.entities.push(boss); this.entity_map[`${x},${y}`]=boss;
            }
            this.game_map.exits=[]; // no exit on boss floor
        }
        // KEY (not on boss floor)
        if(this.current_level<CONFIG.MAX_LEVELS){
            let placed=false;
            for(const room of this.rooms.slice(1)){
                for(let x=room.x1+1;x<room.x2-1&&!placed;x++) for(let y=room.y1+1;y<room.y2-1&&!placed;y++){
                    if(`${x},${y}` in this.entity_map||`${x},${y}` in this.item_map) continue;
                    const k=new Key(x,y); k.createMesh(gameState.scene);
                    this.items.push(k); this.item_map[`${x},${y}`]=k; placed=true;
                }
            }
        }
        // OTHER ITEMS
        for(let i=0;i<ni-1;i++){
            const room=this.rooms[Math.floor(Math.random()*this.rooms.length)];
            const x=Math.floor(Math.random()*(room.x2-room.x1-2))+room.x1+1;
            const y=Math.floor(Math.random()*(room.y2-room.y1-2))+room.y1+1;
            if(`${x},${y}` in this.entity_map||`${x},${y}` in this.item_map) continue;
            const it=Math.random()<0.8?new Potion(x,y):new RarePotion(x,y);
            it.createMesh(gameState.scene); this.items.push(it); this.item_map[`${x},${y}`]=it;
        }
        // GLYPH 20 %
        if(Math.random()<0.2){
            const room=this.rooms[Math.floor(Math.random()*this.rooms.length)];
            const x=Math.floor(Math.random()*(room.x2-room.x1-2))+room.x1+1;
            const y=Math.floor(Math.random()*(room.y2-room.y1-2))+room.y1+1;
            if(!(`${x},${y}` in this.entity_map)&&!(`${x},${y}` in this.item_map)){
                const g=new Glyph(x,y); g.createMesh(gameState.scene);
                this.items.push(g); this.item_map[`${x},${y}`]=g;
            }
        }
    }
    getEnemyName(s){
        const map={g:'Goblin',o:'Orc',t:'Troll',d:'Dragon'};
        return map[s]||'Creature';
    }
    move_entities(){
        if(this.game_state!=='playing') return;
        const px=this.player.x, py=this.player.y;
        for(const e of this.entities){
            if(!(e instanceof Enemy)||!e.is_alive()) continue;
            const d=Math.max(Math.abs(e.x-px),Math.abs(e.y-py));
            if(d<=5){
                const mv=this.findBestMove(e,px,py);
                if(mv){ const ox=e.x, oy=e.y; e.move(mv[0],mv[1]); this.update_entity_position(e,ox,oy,e.x,e.y); }
                else this.moveRandom(e);
            }else if(d<=8&&Math.random()<0.3) this.moveRandom(e);
        }
    }
    findBestMove(en,tx,ty){
        const dx=(en.x<tx)-(en.x>tx), dy=(en.y<ty)-(en.y>ty);
        const opts=[[dx,dy],[dx,0],[0,dy],[0,-dy],[-dx,0],[-dx,-dy]];
        for(const [mx,my] of opts){ const nx=en.x+mx, ny=en.y+my; if(!this.is_occupied(nx,ny)) return [mx,my]; }
        return null;
    }
    moveRandom(en){
        const dirs=[[1,0],[-1,0],[0,1],[0,-1]].sort(()=>Math.random()-0.5);
        for(const [dx,dy] of dirs){ const nx=en.x+dx, ny=en.y+dy; if(!this.is_occupied(nx,ny)){ const ox=en.x, oy=en.y; en.move(dx,dy); this.update_entity_position(en,ox,oy,nx,ny); break; } }
    }
    _handle_new_attack(na){
        if(this.player.attacks.length<4){ this.player.attacks.push(na); this.player.attack_repeat.push(0); }
        else{ const idx=Math.floor(Math.random()*4); this.player.attacks[idx]=na; this.player.attack_repeat[idx]=0; }
        updateCombatActions(); return true;
    }
}

/* ------------------------------------------------------------------
   8.  Three.js init
------------------------------------------------------------------ */
function initThreeJS(){
    gameState.scene=new THREE.Scene(); gameState.scene.background=new THREE.Color(0,0,0);
    gameState.camera=new THREE.PerspectiveCamera(75,window.innerWidth/window.innerHeight,0.1,1000);
    gameState.camera.position.set(15,20,15); gameState.camera.lookAt(15,0,15);
    const canvas=document.getElementById('gameCanvas');
    gameState.renderer=new THREE.WebGLRenderer({canvas,antialias:true}); gameState.renderer.setSize(window.innerWidth,window.innerHeight);
    const al=new THREE.AmbientLight(0x404040); gameState.scene.add(al);
    const dl=new THREE.DirectionalLight(0xffffff,0.5); dl.position.set(1,1,1); gameState.scene.add(dl);
    const gh=new THREE.GridHelper(50,50,0x00ff00,0x003300); gameState.scene.add(gh);
    window.addEventListener('resize',onResize,false);
    animate();
}
function onResize(){
    gameState.camera.aspect=window.innerWidth/window.innerHeight; gameState.camera.updateProjectionMatrix();
    gameState.renderer.setSize(window.innerWidth,window.innerHeight);
}
function animate(){ requestAnimationFrame(animate); gameState.renderer.render(gameState.scene,gameState.camera); }

/* ------------------------------------------------------------------
   9.  UI helpers
------------------------------------------------------------------ */
function updateUI(){
    document.getElementById('currentLevel').textContent=gameState.currentLevel;
    document.getElementById('playerHP').textContent=gameState.player.hp;
    document.getElementById('playerMaxHP').textContent=gameState.player.max_hp;
    document.getElementById('playerATK').textContent=gameState.player.attack;
    document.getElementById('playerDEF').textContent=gameState.player.defense;
    document.getElementById('potionsCount').textContent=gameState.player.inventory.potions;
    document.getElementById('rarePotionsCount').textContent=gameState.player.inventory.rare_potions;
    document.getElementById('hasKey').textContent=gameState.player.inventory.key?'Yes':'No';
}
function updateMessageLog(){
    const ml=document.getElementById('messageLog'); ml.innerHTML='';
    gameState.gameLogic.messageLog.forEach(m=>{
        const d=document.createElement('div'); d.className='message'; d.textContent=m; ml.appendChild(d);
    });
    ml.scrollTop=ml.scrollHeight;
}
function updateCombatActions(){
    const rows=document.querySelectorAll('#actionMenu .action-row');
    for(let i=0;i<4;i++){
        const cell=rows[Math.floor(i/2)].children[i%2];
        if(i<gameState.player.attacks.length){
            const [name,pwr,acc]=gameState.player.attacks[i];
            const rep=gameState.player.attack_repeat[i];
            const adj=Math.max(0.1,acc-rep*0.08);
            cell.textContent=`${i+1}) ${name} (PWR:${pwr} ACC:${Math.floor(adj*100)}%)`;
            cell.style.display='block';
        }else cell.style.display='none';
    }
}
function showCombatPanel(){ document.getElementById('combatPanel').classList.remove('hidden'); updateCombatActions(); }
function hideCombatPanel(){ document.getElementById('combatPanel').classList.add('hidden'); }
function showGameOverPanel(){ document.getElementById('gameOverPanel').classList.remove('hidden'); }
function showVictoryPanel(){ document.getElementById('victoryPanel').classList.remove('hidden'); }

/* ------------------------------------------------------------------
   10.  Game flow
------------------------------------------------------------------ */
function initGame(){
    gameState.player=new Player(0,0);
    gameState.gameMap=new GameMap(CONFIG.MAP_WIDTH,CONFIG.MAP_HEIGHT);
    gameState.gameMap.make_map(CONFIG.MAX_ROOMS,CONFIG.ROOM_MIN_SIZE,CONFIG.ROOM_MAX_SIZE,CONFIG.MAP_WIDTH,CONFIG.MAP_HEIGHT,gameState.player);
    gameState.entities=[gameState.player]; gameState.items=[];
    gameState.gameLogic=new GameLogic(gameState.gameMap,gameState.player,gameState.entities,gameState.items);
    const ne=Math.floor(Math.random()*6)+5, ni=Math.floor(Math.random()*4)+3;
    gameState.gameLogic.populate_map(ne,ni);
    gameState.gameLogic.explore_area(gameState.player.x,gameState.player.y);
    updateUI(); updateMessageLog();
}
function nextLevel(){
    gameState.currentLevel++;
    // clear old meshes (except player)
    gameState.entities.forEach(e=>{ if(e!==gameState.player) gameState.scene.remove(e.mesh); });
    gameState.items.forEach(it=>gameState.scene.remove(it.mesh));
    // keep key
    const hadKey=gameState.player.inventory.key;
    gameState.entities=[gameState.player]; gameState.items=[];
    gameState.player.inventory.key=hadKey;
    // new map
    gameState.gameMap=new GameMap(CONFIG.MAP_WIDTH,CONFIG.MAP_HEIGHT);
    gameState.gameMap.make_map(CONFIG.MAX_ROOMS,CONFIG.ROOM_MIN_SIZE,CONFIG.ROOM_MAX_SIZE,CONFIG.MAP_WIDTH,CONFIG.MAP_HEIGHT,gameState.player);
    gameState.gameLogic.game_map=gameState.gameMap;
    gameState.gameLogic.entities=gameState.entities; gameState.gameLogic.items=gameState.items;
    gameState.gameLogic.entity_map={}; gameState.gameLogic.item_map={};
    gameState.gameLogic.current_level=gameState.currentLevel;
    gameState.gameLogic.update_entity_position(gameState.player,gameState.player.x,gameState.player.y,gameState.player.x,gameState.player.y);
    // populate
    const ne=Math.floor(Math.random()*6)+5+gameState.currentLevel;
    const ni=Math.floor(Math.random()*4)+3+Math.floor(gameState.currentLevel/2);
    gameState.gameLogic.populate_map(ne,ni);
    gameState.gameLogic.explore_area(gameState.player.x,gameState.player.y);
    // camera
    gameState.camera.position.set(gameState.player.x+10,20,gameState.player.y+10);
    gameState.camera.lookAt(gameState.player.x,0,gameState.player.y);
    updateUI();
    gameState.gameLogic.add_message(`You descended to Level ${gameState.currentLevel}.`);
}

/* ------------------------------------------------------------------
   11.  Input
------------------------------------------------------------------ */
function handleKey(ev){
    if(gameState.currentScreen==='frontPage'){
        if(ev.code==='Space'){
            document.getElementById('frontPage').classList.add('hidden');
            document.getElementById('gameScreen').classList.remove('hidden');
            gameState.currentScreen='gameScreen';
            initThreeJS(); initGame();
        }
        return;
    }
    if(gameState.gameState==='gameOver'||gameState.gameState==='victory'){
        if(ev.key==='r'||ev.key==='R') location.reload();
        if(ev.key==='q'||ev.key==='Q') gameState.gameLogic.add_message("Press R to restart or close the tab.");
        return;
    }
    if(gameState.gameState==='combat'){
        if(ev.key>='1'&&ev.key<='7'){
            const act=parseInt(ev.key);
            if(act>=1&&act<=4){
                const cs=new CombatSystem(gameState.player,gameState.gameLogic.current_enemy);
                const [dmg,msg,dead]=cs.player_attack(act-1);
                gameState.gameLogic.add_message(msg);
                if(!dead&&gameState.gameLogic.current_enemy.is_alive()){
                    const [edmg,emsg]=cs.enemy_attack();
                    gameState.gameLogic.add_message(emsg);
                    // status ticks
                    for(const m of gameState.player.apply_status_effects()) gameState.gameLogic.add_message(m);
                    for(const m of gameState.gameLogic.current_enemy.apply_status_effects()) gameState.gameLogic.add_message(m);
                }else if(dead) gameState.gameLogic.end_combat(true);
                document.getElementById('enemyHP').textContent=`HP: ${gameState.gameLogic.current_enemy.hp}/${gameState.gameLogic.current_enemy.max_hp}`;
                document.getElementById('playerCombatHP').textContent=`HP: ${gameState.player.hp}/${gameState.player.max_hp}`;
                updateCombatActions();
            }else if(act===5){
                if(gameState.gameLogic.use_potion()){
                    const cs=new CombatSystem(gameState.player,gameState.gameLogic.current_enemy);
                    const [edmg,emsg]=cs.enemy_attack(); gameState.gameLogic.add_message(emsg);
                    document.getElementById('playerCombatHP').textContent=`HP: ${gameState.player.hp}/${gameState.player.max_hp}`;
                }
            }else if(act===6){
                if(gameState.gameLogic.use_rare_potion()){
                    const cs=new CombatSystem(gameState.player,gameState.gameLogic.current_enemy);
                    const [edmg,emsg]=cs.enemy_attack(); gameState.gameLogic.add_message(emsg);
                    document.getElementById('playerCombatHP').textContent=`HP: ${gameState.player.hp}/${gameState.player.max_hp}`;
                }
            }else if(act===7){
                const cs=new CombatSystem(gameState.player,gameState.gameLogic.current_enemy);
                const [ok,msg]=cs.attempt_flee(); gameState.gameLogic.add_message(msg);
                if(ok){ gameState.gameState='playing'; hideCombatPanel(); }
                else{
                    const [edmg,emsg]=cs.enemy_attack(); gameState.gameLogic.add_message(emsg);
                    document.getElementById('playerCombatHP').textContent=`HP: ${gameState.player.hp}/${gameState.player.max_hp}`;
                }
            }
        }
        return;
    }
    if(gameState.gameState==='playing'){
        let dx=0,dy=0;
        if(ev.key==='ArrowUp'||ev.key==='w'||ev.key==='W') dy=-1;
        else if(ev.key==='ArrowDown'||ev.key==='s'||ev.key==='S') dy=1;
        else if(ev.key==='ArrowLeft'||ev.key==='a'||ev.key==='A') dx=-1;
        else if(ev.key==='ArrowRight'||ev.key==='d'||ev.key==='D') dx=1;
        else if(ev.key==='q'||ev.key==='Q'){ gameState.gameLogic.add_message("Press R to restart or close the tab."); return; }
        else if(ev.key==='r'||ev.key==='R'){ location.reload(); return; }
        if(dx!==0||dy!==0){
            gameState.gameLogic.move_player(dx,dy);
            gameState.camera.position.set(gameState.player.x+10,20,gameState.player.y+10);
            gameState.camera.lookAt(gameState.player.x,0,gameState.player.y);
            updateUI();
        }
    }
}
document.addEventListener('keydown',handleKey);
document.getElementById('actionMenu').addEventListener('click',(ev)=>{
    if(ev.target.classList.contains('action')){
        const fake={key:ev.target.dataset.action};
        handleKey(fake);
    }
});
})();   // end IIFE