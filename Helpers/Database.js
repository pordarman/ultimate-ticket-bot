"use strict";
const mongodb = require("mongodb");
const client = new mongodb.MongoClient(process.env.MONGO_URI);
const LRUCache = require("lru-cache");
const os = require("os");

const userCaches = new LRUCache.LRUCache({
    max: 10_000,
    ttl: 1000 * 60 * 60, // 1 saat
    updateAgeOnGet: true
});
const ticketCaches = new LRUCache.LRUCache({
    max: 10_000,
    ttl: 1000 * 60 * 60, // 1 saat
    updateAgeOnGet: true
});
const logCaches = new LRUCache.LRUCache({
    max: 10_000,
    ttl: 1000 * 60 * 60, // 1 saat
    updateAgeOnGet: true
});
const blacklistCaches = new LRUCache.LRUCache({
    max: 10_000,
    ttl: 1000 * 60 * 60, // 1 saat
    updateAgeOnGet: true
});

const updateCache = new Map();
const updateTimers = new Map();
const UPDATE_TIMEOUT = 5000;

let isClosing = false;

/**
 * @typedef {Object} TicketObject
 * @property {String} channelId - Ticket kanalının id'si
 * @property {String} authorId - Ticket kanalını açan kişinin id'si
 * @property {Number} createdTimestamp - Ticket kanalının oluşturulma zamanı
 * @property {Number} [closedTimestamp] - Ticket kanalının kapatılma zamanı
 * @property {Number} [reopenedTimestamp] - Ticket kanalının yeniden açılma zamanı
 * @property {Number} [permClosedTimestamp] - Ticket kanalının kalıcı olarak kapatılma zamanı
 * @property {Number} [archivedTimestamp] - Ticket kanalının arşivlenme zamanı
 * @property {String} openedReason - Ticket kanalının açılma sebebi
 * @property {String} ticketId - Ticket kanalının numarası
 * @property {Number} [urgency] - Ticket kanalının aciliyet durumu
 * @property {"Genel Destek" | "Öneri" | "Şikayet" | "Diğer"} category - Ticket kanalının kategorisi
 * @property {"opened" | "closed" | "perm_closed" | "archived"} status - Ticket kanalının durumu
 * @property {String} [closedBy] - Ticket kanalını kapatan kişinin id'si
 * @property {String} [closedReason] - Ticket kanalının kapatılma nedeni
 * @property {Number} lastUpdatedTimestamp - Ticket kanalının son güncellenme zamanı
 * @property {Number} messageCount - Ticket kanalındaki mesaj sayısı
 */

/**
 * @typedef {Object} CurrentTicketObject
 * @property {String} channelId - Ticket kanalının id'si
 * @property {Number} ticketId - Ticket kanalının numarası
 * @property {Number} createdTimestamp - Ticket kanalının oluşturulma zamanı
 */

/**
 * @typedef {Object} ClosedTicketObject
 * @property {String} channelId - Ticket kanalının id'si
 * @property {Number} ticketId - Ticket kanalının numarası
 * @property {Number} closedTimestamp - Ticket kanalının kapatılma zamanı
 */

/**
 * @typedef {Object} ArchivedTicketObject
 * @property {String} channelId - Ticket kanalının id'si
 * @property {Number} ticketId - Ticket kanalının numarası
 * @property {Number} archivedTimestamp - Ticket kanalının arşivlenme zamanı
 */

/**
 * @typedef {Object} TicketCountObject
 * @property {Number} opened - Açık olan ticket kanallarının sayısı
 * @property {Number} closed - Kapatılan ticket kanallarının sayısı
 * @property {Number} archived - Arşivlenen ticket kanallarının sayısı
 * @property {Number} calls - Kullanıcının çağrı sayısı
 */

/**
 * @typedef {Object} UserObject
 * @property {String} userId - Kullanıcının id'si
 * @property {CurrentTicketObject} currentTicket - Kullanıcının açık olan ticket kanalının verileri
 * @property {ClosedTicketObject} closedTicket - Kullanıcının kapatılan ticket kanalının verileri
 * @property {Object<String, CurrentTicketObject>} archivedTickets - Kullanıcının arşivlenen ticket kanallarının verileri
 * @property {TicketCountObject} ticketCounts - Kullanıcının ticket istatistikleri
 * @property {Number} lastTicketTimestamp - Kullanıcının son ticket kanalının açılma zamanı
 */

/**
 * @typedef {Object} TicketLogArrayObject
 * @property {"ticket_opened" | "ticket_reopened" | "ticket_closed" | "ticket_permclosed" | "ticket_archived" | "user_call"} action - Log mesajının tipi
 * @property {String} by - Log mesajının atılmasına sebep olan kişinin id'si
 * @property {String} reason - Log mesajının sebebi (Sadece açma ve kapatma işlemlerinde)
 * @property {Number} timestamp - Log mesajının atılma zamanı
 */

/**
 * @typedef {Object} TicketLogObject
 * @property {String} ticketId - Log mesajının bulunduğu ticket kanalının id'si
 * @property {Number} lastUpdatedTimestamp - Log mesajının son güncellenme zamanı
 * @property {String} ticketAuthorId - Ticket kanalını açan kişinin id'si
 * @property {TicketLogArrayObject[]} logs - Log mesajlarının verileri
 */

/**
 * @typedef {Object} BlacklistObject
 * @property {String} userId - Kullanıcının id'si
 * @property {String} moderatorId - Kullanıcıyı karalisteye ekleyen moderatörün id'si
 * @property {String} reason - Karalisteye eklenme sebebi
 * @property {Number} createdTimestamp - Karalisteye eklenme zamanı
 */

class MongoDB {


    /**
     * @async
     * Bütün ayarlamaları otomatik olarak yapar
     * @returns {Promise<Boolean>}
     */
    async init() {
        // Eğer daha önceden bağlantı varsa bağlantıyı kapat
        await client.close(true);
        const isConnected = await this.connect();

        // Bağlantı başarısız oldu
        if (!isConnected) {
            console.error(`Şu anda MongoDB sunucusuna bağlanamıyoruz, lütfen daha sonra yeniden deneyiniz!`);
            process.exit(1);
        }

        const db = client.db("Main");

        this.tickets = db.collection("Tickets");
        this.users = db.collection("Users");
        this.logs = db.collection("Logs");
        this.blacklist = db.collection("Blacklist");
        this.counters = db.collection("Counters");

        this.tickets.createIndex({ channelId: 1 }, { unique: true });
        this.users.createIndex({ userId: 1 }, { unique: true });
        this.logs.createIndex({ ticketId: 1 }, { unique: true });
        this.blacklist.createIndex({ userId: 1 }, { unique: true });

        // Uygulamada bir hata olduğunda konsola yazdır
        client.on("error", (error) => {
            console.error(error);
        });

        const Util = require("./Util");

        // Uygulama kapatıldığında MongoDB bağlantısını kapat
        const shutdown = async () => {
            if (isClosing) return;
            isClosing = true;

            Util.console.log("Uygulama kapanıyor, MongoDB bağlantısı kapatılıyor...");

            // MongoDB bağlantısını kapatmadan önce bütün timeout'ları çalıştır
            await Promise.all([...updateTimers.keys()].map(async (key) => {
                clearTimeout(updateTimers.get(key));
                const [collection, fileId] = key.split(".");

                await this.updateFile(
                    fileId,
                    updateCache.get(fileId),
                    collection,
                    true
                );
            }));

            await client.close(true);
            Util.console.log("MongoDB bağlantısı kapatıldı!");
            process.exit(0);
        };

        // PM2 üzerinden kapatma sinyalleri için
        process.on(
            os.platform() == "win32" ? "SIGINT" : "SIGTERM",
            shutdown
        );

        return true;
    }


    /**
     * @async
     * MongoDB sunucusuna bağlanılır
     * @param {Number} timeout - Sunucuya yeniden bağlanma süresi
     * @returns {Promise<Boolean>}
     */
    async connect() {
        try {
            await client.connect();
            return true;
        } catch (error) {
            console.error(error);
            return false;
        }
    }


    /**
     * İki mongodb objesini birleştirir
     * @param {String} fileName - Birleştirilecek ilk objenin ismi
     * @param {mongodb.UpdateFilter<mongodb.BSON.Document>} updateObject - Birleştirilecek ikinci obje
     * @returns {void} - Birleştirilmiş obje ilk objenin üzerine yazılır
     */
    combineTwoMongoDBObject(fileName, updateObject) {
        if (!updateCache.has(fileName)) {
            updateCache.set(fileName, { $set: {}, $push: {}, $unset: {}, $inc: {} });
        }

        const cache = updateCache.get(fileName);

        cache.$set ??= {};
        cache.$push ??= {};
        cache.$unset ??= {};
        cache.$inc ??= {};

        // $set işlemlerini birleştir
        if (updateObject.$set) {
            for (const key in updateObject.$set) {
                cache.$set[key] = updateObject.$set[key];

                // Eğer $set işlemi $unset key'lerinin içinde varsa $unset işlemini sil
                for (const cacheKey in cache.$unset) {
                    if (key.startsWith(cacheKey) || cacheKey.startsWith(key)) delete cache.$unset[cacheKey];
                }
            }
        }

        // $push işlemlerini birleştir
        if (updateObject.$push) {
            for (const key in updateObject.$push) {
                cache.$push[key] ??= { $each: [] };

                const pushOrUnshift = updateObject.$push[key].$position == 0 ? "unshift" : "push";
                const eachArray = "$each" in updateObject.$push[key] ? updateObject.$push[key].$each : [updateObject.$push[key]];

                cache.$push[key].$each[pushOrUnshift](...eachArray);
            }
        }

        // $unset işlemlerini birleştir
        if (updateObject.$unset) {
            for (const key in updateObject.$unset) {
                cache.$unset[key] = "";

                // Eğer $unset işlemi $set key'lerinin içinde varsa $set işlemini sil
                for (const cacheKey in cache.$set) {
                    if (key.startsWith(cacheKey) || cacheKey.startsWith(key)) delete cache.$set[cacheKey];
                }
            }
        }

        // $inc işlemlerini birleştir
        if (updateObject.$inc) {
            for (const key in updateObject.$inc) {
                cache.$inc[key] = (cache.$inc[key] ?? 0) + updateObject.$inc[key];
            }
        }
    }


    // #region Get
    /**
     * @async
     * Ticket kanalının numarasını döndürür
     * @returns {Promise<Number>}
     */
    async getNextTicketNumber() {
        const result = await this.counters.findOneAndUpdate(
            {},
            { $inc: { value: 1 } },
            { returnDocument: "after", upsert: true }
        );

        if (result === null) {
            await this.counters.insertOne({ value: 1 });
            return 1;
        }

        return result.value;
    }


    /**
     * @async
     * MongoDB'den kullanıcının verilerini döndürür
     * @param {String} userId - Kullanıcının id'si
     * @returns {Promise<UserObject>}
     */
    async getUser(userId) {
        const cacheUser = userCaches.get(userId);
        if (cacheUser) return cacheUser;

        const user = await this.users.findOne({ userId }, { projection: { _id: 0 } });
        if (user) {
            userCaches.set(userId, user);
            return user;
        };

        const newUser = {
            userId,
            currentTicket: null,
            closedTicket: null,
            archivedTickets: {},
            ticketCounts: {
                opened: 0,
                closed: 0,
                archived: 0,
                calls: 0
            },
            lastTicketTimestamp: 0,
        };

        await this.users.insertOne(newUser);
        userCaches.set(userId, newUser);
        return newUser;
    }



    /**
     * @async
     * MongoDB'den ticket kanalının verilerini döndürür
     * @param {String} channelId - Ticket kanalının id'si
     * @param {Boolean} createNew - Eğer yoksa yeni bir tane oluşturulmalı mı?
     * @returns {Promise<TicketObject>}
     */
    async getTicket(channelId) {
        const cacheTicket = ticketCaches.get(channelId);
        if (cacheTicket) return cacheTicket;

        const ticket = await this.tickets.findOne({ channelId }, { projection: { _id: 0 } });
        if (ticket) {
            ticketCaches.set(channelId, ticket);
            return ticket;
        }

        return null;
    }


    /**
     * @async
     * MongoDB'den belirli bir filtreye göre ticket kanallarını döndürür
     * @param {mongodb.Filter<mongodb.BSON.Document>} filter - Filtre
     * @returns {Promise<TicketObject[]>}
     */
    async getTicketsByFilter(filter) {
        const tickets = await this.tickets.find(filter).toArray();
        return tickets;
    }


    /**
     * @async
     * Bütün ticket kanallarını döndürür
     * @returns {Promise<TicketObject[]>}
     */
    async getAllTickets() {
        return this.getTicketsByFilter({});
    }


    /**
     * @async
     * MongoDB'den karalistede olan bir kullanıcıyı döndürür
     * @param {String} userId - Kullanıcının id'si
     * @returns {Promise<BlacklistObject>}
     */
    async getBlacklistedUser(userId) {
        const cacheUser = blacklistCaches.get(userId);
        if (cacheUser) return cacheUser;

        const user = await this.blacklist.findOne({ userId }, { projection: { _id: 0 } });
        if (user) {
            blacklistCaches.set(userId, user);
            return user;
        }

        return null;
    }


    /**
     * @async
     * MongoDB'den belirli bir filtreye göre karalistedeki kullanıcıları döndürür
     * @param {mongodb.Filter<mongodb.BSON.Document>} filter 
     * @returns {Promise<BlacklistObject[]>}
     */
    async getBlacklistedUsersByFilter(filter) {
        const users = await this.blacklist.find(filter).toArray();
        return users;
    }


    /**
     * @async
     * Bütün karalistedeki kullanıcıları döndürür
     * @returns {Promise<BlacklistObject[]>}
     */
    async getAllBlacklistedUsers() {
        return this.getBlacklistedUsersByFilter({});
    }

    /**
     * @async
     * MongoDB'den ticket kanalının log verilerini döndürür
     * @param {String} ticketId - Ticket kanalının id'si
     * @returns {Promise<TicketLogObject>}
     */
    async getTicketLog(ticketId) {
        const cacheLog = logCaches.get(ticketId);
        if (cacheLog) return cacheLog;

        const log = await this.logs.findOne({ ticketId }, { projection: { _id: 0 } });
        if (log) {
            logCaches.set(ticketId, log);
            return log;
        }

        return null;
    }

    // #endregion

    // #region Has
    /**
     * @async
     * Girilen ID'deki kullanının karalistede olup olmadığını kontrol eder
     * @param {String} userId - Kullanıcının id'si
     * @returns {Promise<Boolean>}
     */
    async isBlacklisted(userId) {
        return Boolean(await this.getBlacklistedUser(userId));
    }
    // #endregion

    // #region Create
    /**
     * @async
     * Ticket kanalı oluşturur
     * @param {TicketObject} ticket - Ticket kanalının verileri
     * @returns {Promise<TicketObject>}
     */
    async createTicket(ticket) {
        const ticketInfo = {
            ...ticket,
            status: "opened",
            messageCount: 0
        };

        const ticketLogInfo = {
            ticketId: ticketInfo.ticketId,
            ticketAuthorId: ticketInfo.authorId,
            logs: []
        };

        await Promise.all([
            this.tickets.insertOne(ticketInfo),
            this.logs.insertOne(ticketLogInfo),
        ]);
        ticketCaches.set(ticket.channelId, ticketInfo);
        return ticketInfo;
    }


    /**
     * @async
     * Bir kullanıcıyı karalisteye ekler
     * @param {String} userId - Kullanıcının id'si
     * @param {String} moderatorId - Kullanıcıyı karalisteye ekleyen moderatörün id'si
     * @param {String} reason - Karalisteye eklenme sebebi
     * @returns {Promise<Boolean>}
     */
    async addUserToBlacklist(userId, moderatorId, reason) {
        const blacklist = {
            userId,
            moderatorId,
            reason,
            createdTimestamp: Date.now()
        };

        await this.blacklist.insertOne(blacklist);
        blacklistCaches.set(userId, blacklist);
        return true;
    }
    // #endregion

    // #region Delete
    /**
     * @async
     * Karalistedeki bir kişiyi siler
     * @param {String} userId - Kullanıcının id'si
     * @returns {Promise<Boolean>}
     */
    async removeUserFromBlacklist(userId) {
        await this.blacklist.deleteOne({ userId });
        blacklistCaches.delete(userId);
        return true;
    }


    // #region Save
    /**
     * @async
     * MongoDB'deki kullanıcıyı veya ticket'i günceller
     * @param {String} fileId - Güncellenecek verinin ismi (userId veya channelId)
     * @param {mongodb.UpdateFilter<mongodb.BSON.Document>} updateObject - Güncellenecek veriler
     * @param {"users" | "tickets" | "logs"} collection - Güncellenecek koleksiyon
     * @param {Boolean} force - Güncelleme işlemini zorlaştırır
     * @returns {Promise<Boolean>}
     */
    async updateFile(fileId, updateObject, collection, force = false) {
        if (Object.values(updateObject).every((value) => Object.keys(value).length == 0)) {
            return false;
        }

        this.combineTwoMongoDBObject(fileId, updateObject);

        const key = {
            users: "userId",
            tickets: "channelId",
            logs: "ticketId",
            blacklist: "userId"
        }[collection];

        // Eğer hemen güncelleme yapılmasını istiyorsa
        if (force) {
            await this[collection].updateOne({ [key]: fileId }, updateCache.get(fileId));
            updateCache.delete(fileId);
            return true;
        }

        // Eğer şu anda devam eden bir setTimeout varsa hiçbir şey yapma
        if (updateTimers.has(`${collection}.${fileId}`)) {
            return true;
        }

        // 5 saniye sonra güncelleme yap
        updateTimers.set(`${collection}.${fileId}`, setTimeout(async () => {
            const cache = updateCache.get(fileId);

            // Bütün keylerde dolaş ve boş bir objesi olan keyleri sil
            for (const key in cache) {
                if (Object.keys(cache[key]).length == 0) {
                    delete cache[key];
                }
            }

            // Database'deki sunucuyu güncelle
            try {
                await this[collection].updateOne({ [key]: fileId }, cache);
            } catch (error) {
                console.error(error);
                console.error(cache);
            } finally {
                updateCache.delete(fileId);
                updateTimers.delete(`${collection}.${fileId}`);
            }
        }, UPDATE_TIMEOUT));

        return true;
    }

    /**
     * @async
     * MongoDB'deki ticket verilerini günceller
     * @param {String} channelId - Güncellenecek ticket kanalının id'si
     * @param {mongodb.UpdateFilter<mongodb.BSON.Document>} updateObject - Güncellenecek veriler
     * @returns {Promise<Boolean>}
     */
    async updateTicket(channelId, updateObject) {
        return this.updateFile(channelId, updateObject, "tickets");
    }


    /**
     * @async
     * MongoDB'deki kullanıcı verilerini günceller
     * @param {String} userId - Güncellenecek kullanıcının id'si
     * @param {mongodb.UpdateFilter<mongodb.BSON.Document>} updateObject - Güncellenecek veriler
     * @returns {Promise<Boolean>}
     */
    async updateUser(userId, updateObject) {
        return this.updateFile(userId, updateObject, "users");
    }


    /**
     * @async
     * MongoDB'deki log verilerini günceller
     * @param {String} ticketId - Güncellenecek log verisinin id'si
     * @param {mongodb.UpdateFilter<mongodb.BSON.Document>} updateObject - Güncellenecek veriler
     * @returns {Promise<Boolean>}
     */
    async updateLog(ticketId, updateObject) {
        return this.updateFile(ticketId, updateObject, "logs");
    }


    /**
     * @async
     * Ticket kanalının mesaj sayısını günceller
     * @param {String} channelId 
     * @returns {Promise<Boolean>}
     */
    async updateTicketMessageCountIfExist(channelId) {
        const ticket = await this.getTicket(channelId);
        if (!ticket) return false;

        ticket.messageCount++;
        return await this.updateTicket(channelId, { $inc: { messageCount: 1 } });
    }

    // #endregion

    // #region Log
    /**
     * @async
     * Ticket koleksiyonuna log mesajı ekler
     * @param {TicketLogArrayObject} options - Log mesajının verileri
     * @param {{ ticketId: String, channelId: String, ticketAuthorId: String }} ticketInfo - Ticket kanalının verileri
     * @returns {Promise<Boolean>}
     */
    async logTicket(options, ticketInfo) {
        const NOW = options.timestamp || Date.now();

        const ticketLog = await this.getTicketLog(options.ticketId) || {
            ticketId: ticketInfo.ticketId,
            channelId: ticketInfo.channelId,
            lastUpdatedTimestamp: NOW,
            ticketAuthorId: ticketInfo.ticketAuthorId,
            logs: []
        };

        const logObject = {
            ...options,
            timestamp: NOW
        };
        ticketLog.logs.unshift(logObject);
        ticketLog.lastUpdatedTimestamp = NOW;

        await this.updateLog(ticketInfo.ticketId, {
            $set: {
                lastUpdatedTimestamp: ticketLog.lastUpdatedTimestamp
            },
            $push: {
                logs: {
                    $each: [logObject],
                    $position: 0
                }
            }
        });

        return true;
    }

    // #endregion


    // #region General

    /**
     * @async
     * Önbellekleri temizler
     * @returns {void}
     */
    resetCache() {
        userCaches.clear();
        ticketCaches.clear();
        logCaches.clear();
        blacklistCaches.clear();
    }

    /**
     * @async
     * Databasenin ping değerini döndürür
     * @param {String} guildId - Ping değeri alınacak sunucunun verileri
     * @returns {Promise<Number>}
     */
    async ping() {
        const startTime = Date.now();
        await client.db("Main").command({ ping: 1 });
        return Date.now() - startTime;
    }



    /**
     * @async
     * MongoDB'nin versiyonunu döndürür
     * @returns {Promise<String>}
     */
    async version() {
        return (await client.db("Main").admin().serverInfo()).version;
    }

    // #endregion
}

module.exports = new MongoDB();