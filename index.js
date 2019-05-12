'use strict'
String.prototype.clr = function (hexColor) { return `<font color='#${hexColor}'>${this}</font>` };

module.exports = function LetMePot(mod) {
    const potions = require('./potions');

    let oHp = 100,
        oMana = 100,
        oLoc = null,
        oW = 0,
        getPotInfo = false,
        resCd = false;

    let hpPotList = potions.filter(function (p) { return p.hp == true; }),
        manaPotList = potions.filter(function (p) { return p.hp != true; });

    hpPotList.sort(function (a, b) { return parseFloat(a.use_at) - parseFloat(b.use_at); });
    manaPotList.sort(function (a, b) { return parseFloat(a.use_at) - parseFloat(b.use_at); });

    mod.game.me.on('resurrect', () => { 
        resCd = true;
        setTimeout(()=>{resCd = false;}, mod.settings.delayAfterRes);
    })
    
    mod.hook('C_PLAYER_LOCATION', 5, { order: -10 }, (event) => {
        oLoc = (event.loc + event.dest) / 2;
        oW = event.w;
    });

    mod.hook('S_INVEN', 18, { order: -10 }, (event) => {
        if (!mod.settings.enabled) return; // Too much info, better just turn off if disabled

        let tempInv = event.items;
        for (let i = 0; i < tempInv.length; i++) {
            for (let o = 0; o < hpPotList.length; o++) {
                if (hpPotList[o].item == tempInv[i].id) {
                    hpPotList[o].invQtd = tempInv[i].amount;
                    hpPotList[o].id = tempInv[i].dbid;
                }
            }
            for (let p = 0; p < manaPotList.length; p++) {
                if (manaPotList[p].item == tempInv[i].id) {
                    manaPotList[p].invQtd = tempInv[i].amount;
                    manaPotList[p].id = tempInv[i].dbid;
                }
            }
        }
    });

    mod.hook('C_USE_ITEM', 3, { order: -10 }, (event) => {
        if (getPotInfo == true && mod.game.me.is(event.gameId)) {
            mod.command.message('Potion info: { item: ' + event.id + ' }');
            getPotInfo = false;
        }
    });

    mod.hook('S_CREATURE_CHANGE_HP', 6, (event) => {
        if (!mod.settings.enabled || !mod.settings.autoHp || resCd) return;

        if (mod.game.me.is(event.target)) {
            if ((mod.game.me.inCombat || !mod.settings.combatOnly) && mod.game.me.alive) {
                oHp = Math.round(Number(event.curHp) / Number(event.maxHp) * 100);
                
                for (let i = 0; i < hpPotList.length; i++) {
                    if (oHp <= hpPotList[i].use_at && hpPotList[i].inCd == false && hpPotList[i].invQtd > 0) {
                        useItem(hpPotList[i]);
                        hpPotList[i].inCd = true;
                        hpPotList[i].invQtd--;
                        setTimeout(function () { hpPotList[i].inCd = false; }, hpPotList[i].cd * 1000);
                        if (mod.settings.notifications) mod.command.message('Used ' + hpPotList[i].name + ', still have ' + hpPotList[i].invQtd + ' left.');
                        //break;
                    }
                }
            }
        }

    });

    mod.hook('S_PLAYER_CHANGE_MP', 1, (event) => {
        if (!mod.settings.enabled || !mod.settings.autoMp || resCd) return;

        if (mod.game.me.is(event.target)) {
            if ((mod.game.me.inCombat || !mod.settings.combatOnly) == true && mod.game.me.alive) {
                oMana = Math.round(Number(event.currentMp) / Number(event.maxMp) * 100);
                for (let i = 0; i < manaPotList.length; i++) {
                    if (oMana <= manaPotList[i].use_at && manaPotList[i].inCd == false && manaPotList[i].invQtd > 0) {
                        useItem(manaPotList[i]);
                        manaPotList[i].inCd = true;
                        manaPotList[i].invQtd--;
                        setTimeout(function () { manaPotList[i].inCd = false; }, manaPotList[i].cd * 1000);
                        if (mod.settings.notifications) mod.command.message('Used ' + manaPotList[i].name + ', still have ' + manaPotList[i].invQtd + ' left.');
                        //break;
                    }
                }
            }
        }

    });

    function useItem(potInfo) {
        mod.send('C_USE_ITEM', 3, {
            gameId: mod.game.me.gameId,
            id: potInfo.item,
            dbid: potInfo.id,
            target: 0,
            amount: 1,
            dest: {x: 0, y: 0, z: 0},
            loc: oLoc,
            w: oW,
            unk1: 0,
            unk2: 0,
            unk3: 0,
            unk4: 1
        });        
    }

    mod.command.add('getpotinfo', () => {
        getPotInfo = true;
        mod.command.message('Use the potion you want');
    });
    
    mod.command.add('letmepot', (arg, arg2) => {
        if (arg) arg = arg.toLowerCase();
        if (arg2) arg2 = arg2.toLowerCase();
        
        if (arg === undefined) {
            mod.settings.enabled = !mod.settings.enabled;
            mod.command.message(mod.settings.enabled ? 'Enabled'.clr('56B4E9') : 'Disabled'.clr('E69F00'));
        }
        else if (["off", "false", "0", "disable"].includes(arg))
        {
            mod.settings.enabled = false;
            mod.command.message(mod.settings.enabled ? 'Enabled'.clr('56B4E9') : 'Disabled'.clr('E69F00'));
        }
        else if (["on", "true", "1", "enable"].includes(arg))
        {
            mod.settings.enabled = true;
            mod.command.message(mod.settings.enabled ? 'Enabled'.clr('56B4E9') : 'Disabled'.clr('E69F00'));
        }
        else if(["hp", "heal", "health"].includes(arg))
        {
            if (["off", "false", "0", "disable"].includes(arg2)) {
                mod.settings.autoHp = false;
            } else if (["on", "true", "1", "enable"].includes(arg2)) {
                mod.settings.autoHp = true;
            } else {
                mod.settings.autoHp = !mod.settings.autoHp;
            }
            mod.command.message('Auto-HP: ' + (mod.settings.autoHp ? 'Enabled'.clr('56B4E9') : 'Disabled'.clr('E69F00')));
        }
        else if(["mp", "mana"].includes(arg))
        {
            if (["off", "false", "0", "disable"].includes(arg2)) {
                mod.settings.autoMp = false;
            } else if (["on", "true", "1", "enable"].includes(arg2)) {
                mod.settings.autoMp = true;
            } else {
                mod.settings.autoMp = !mod.settings.autoMp;
            }
            mod.command.message('Auto-MP: ' + (mod.settings.autoMp ? 'Enabled'.clr('56B4E9') : 'Disabled'.clr('E69F00')));
        }
        else if(["notice", "notification", "notifications", "message", "messages"].includes(arg))
        {
            if (["off", "false", "0", "disable"].includes(arg2)) {
                mod.settings.notifications = false;
            } else if (["on", "true", "1", "enable"].includes(arg2)) {
                mod.settings.notifications = true;
            } else {
                mod.settings.notifications = !mod.settings.notifications;
            }
            mod.command.message('Notifications: ' + (mod.settings.notifications ? 'Enabled'.clr('56B4E9') : 'Disabled'.clr('E69F00')));
        }     
        else if(["combat"].includes(arg))
        {
            if (["off", "false", "0", "disable"].includes(arg2)) {
                mod.settings.combatOnly = false;
            } else if (["on", "true", "1", "enable"].includes(arg2)) {
                mod.settings.combatOnly = true;
            } else {
                mod.settings.combatOnly = !mod.settings.combatOnly;
            }
            mod.command.message('Use only in combat: ' + (mod.settings.combatOnly ? 'Enabled'.clr('56B4E9') : 'Disabled'.clr('E69F00')));
        }        
    });
    
}