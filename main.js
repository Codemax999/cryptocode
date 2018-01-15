// --- Coin Data Object ---
class CoinData {

  constructor(...args) {

    this.id = [...args][0]
    this.symbol = [...args][1]
    this.name = [...args][2]
    this.circulation = [...args][3]
    this.totalSupply = [...args][4]
    this.remainingCount = [...args][5]
    this.remainingPercent = [...args][6]
    this.price = [...args][7]
    this.marketCap = [...args][8]
    this.oneHour = [...args][9]
    this.oneDay = [...args][10]
    this.sevenDay = [...args][11]
  }
}


// --- Controller / Singleton ---
class Controller {

  constructor() {

    // Model and View
    this.model = new Model()
    this.view = new View()

    // load data
    this.loadData()

    // attach listeners
    this.eventListeners()
  }

  static getInstance() {

    // create singleton
    if (!Controller._instance) {

      Controller._instance = new Controller()
      return Controller._instance
    }
  }

  loadData() {

    // default sort and filter
    const sort = document.querySelector('.type').value
    const filter = document.querySelector('.rank').value

    // default sorted by lowest price
    fetch('https://api.coinmarketcap.com/v1/ticker/?limit=500')
      .then(res => res.json())
      .then(this.model.processData)
      .then(() => this.filterFull(sort, filter))
      .catch(console.error)
  }

  eventListeners() {

    // filter selection
    this.filterChange()
    this.filterRank()

    // get related coins
    document.addEventListener('relatedCoins', ev => this.relatedCoins(ev.detail))

    // hide modal
    document.querySelector('.modal-overlay').addEventListener('click', Utility.hideModal)
    document.querySelector('.btn-clear').addEventListener('click', Utility.hideModal)
  }

  filterChange() {

    // filter change
    document.querySelector('.type').addEventListener('change', e => {

      // sort selection and rank
      const sort = e.target.value
      const rank = document.querySelector('.rank').value

      // apply all filters
      this.filterFull(sort, rank)
    })
  }

  filterRank() {

    // filter change 
    document.querySelector('.rank').addEventListener('change', e => {

      // rank and sort selection
      const rank = e.target.value
      const sort = document.querySelector('.type').value

      // apply all filters
      this.filterFull(sort, rank)
    })
  }

  filterFull(sort, rank) {

    // determine filter
    let filter;
    if (sort === 'Low Price & Low Total Supply') filter = this.model.sortCheapestLowSupply()
    else if (sort === 'Low Price & Low Remaining Supply') filter = this.model.sortCheapestLowRemaining()
    else if (sort === 'Lowest Price') filter = this.model.sortPrice()
    else if (sort === 'Lowest Total Supply') filter = this.model.sortTotalSupply()
    else if (sort === 'Lowest Remaining Supply') filter = this.model.sortRemaining()

    // clear previous results -> filter -> displau
    Utility.clearTable()
      .then(() => this.model.filterByRank(rank))
      .then(filter)
      .then(this.view.displayData)
  }

  relatedCoins(coin) {

    // get current and related coin data
    this.model.getRelatedCoins(coin)
      .then(res => {

        // show modal
        Utility.showModal()

        // display data
        this.view.displayModalData(res[0], res[1])
      })
  }
}


// --- Model ---
class Model {

  processData(data) {

    // generate CoinData Objects
    return new Promise(resolve => {

      // iterate
      data.map((x, i) => {

        // circulating, total and remaining coin supply
        const circ = x.available_supply
        const total = x.max_supply === null ? x.total_supply : x.max_supply
        const remain = total - circ
        const remainOne = total - remain
        const remainTwo = remainOne / total
        const remainPercent = 100 - (remainTwo * 100)

        // coin data
        const coinData = new CoinData(
          i,
          x.symbol,
          x.id.toUpperCase(),
          Number(circ),
          Number(total),
          remain,
          remainPercent.toFixed(3),
          Number(x.price_usd),
          Number(x.market_cap_usd),
          Number(x.percent_change_1h),
          Number(x.percent_change_24h),
          Number(x.percent_change_7d),
        )

        // update array
        Model.coins = [...Model.coins, coinData]

        // pass data to be sorted
        if (i === data.length - 1) resolve()
      })
    })
  }

  sortPrice() {

    // lowest overall cost
    return new Promise(resolve => {

      Utility.sortByPriceAsc(Model.coins)
        .then(res => resolve(res))
    })
  }

  sortRemaining() {

    // lowest remaining coins
    return new Promise(resolve => {

      Utility.sortByRemainingAsc(Model.coins)
        .then(res => resolve(res))
    })
  }

  sortTotalSupply() {

    // lowest total supply
    return new Promise(resolve => {

      Utility.sortByTotalSupplyAsc(Model.coins)
        .then(res => resolve(res))
    })
  }

  sortCheapestLowSupply() {

    // cheapest coins from lowest total supply
    return new Promise(resolve => {

      Utility.sortByTotalSupplyAsc(Model.coins)
        .then(Utility.filterLowSupply)
        .then(Utility.sortByPriceAsc)
        .then(res => resolve(res))
    })
  }

  sortCheapestLowRemaining() {

    // cheapest coins from coins that are closest to max capacity
    return new Promise(resolve => {

      Utility.sortByRemainingAsc(Model.coins)
        .then(Utility.filterLowRemaining)
        .then(Utility.sortByPriceAsc)
        .then(res => resolve(res))
    })
  }

  filterByRank(rank) {

    // filter full list by rank
    return new Promise(resolve => {

      const filtered = Model.coins.filter(x => x.id <= rank)
      resolve(filtered)
    })
  }

  getRelatedCoins(coin) {

    // get coins with similar total supply
    return new Promise(resolve => {

      // current coin data object
      let currentCoin

      // related coins
      Utility.getCoinByName(coin, Model.coins)
        .then(res => {

          currentCoin = res
          return Utility.getCoinsByMinMax(res, Model.coins)
        })
        .then(Utility.sortByTotalSupplyAsc)
        .then(res => resolve([currentCoin, res]))
    })
  }
}

// top 500 coins
Model.coins = []


// --- View ---
class View {

  displayData(data) {

    // hide loading 
    document.querySelector('.loading').classList.add('hide')

    // show data
    data.map(x => {

      // table row
      const tr = document.createElement('tr')
      tr.id = x.name
      tr.innerHTML = 
      `
        <td>${x.id}</td>
        <td>
          <b>${x.symbol}</b> 
          <small class='label'>${x.name}</small>
        </td>
        <td>$${x.price.toLocaleString()}</td>
        <td>${x.totalSupply.toLocaleString()}</td>
        <td>${x.circulation.toLocaleString()}</td>
        <td>${x.remainingCount.toLocaleString()}</td>
        <td>${x.remainingPercent}%</td>
        <td>$${x.marketCap.toLocaleString()}</td>
        <td class="${x.oneHour < 0 ? 'text-error' : 'text-success'}">${x.oneHour}%</td>
        <td class="${x.oneDay < 0 ? 'text-error' : 'text-success'}">${x.oneDay}%</td>
        <td class="${x.sevenDay < 0 ? 'text-error' : 'text-success'}">${x.sevenDay}%</td>
      `

      // click listener for related coins
      tr.addEventListener('click', ev => {

        const coin = ev.path[1].id ? ev.path[1].id : ev.path[2].id
        const relatedCoins = new CustomEvent('relatedCoins', { 'detail': coin })
        document.dispatchEvent(relatedCoins)
      })

      // append to table
      document.querySelector('#mainTable').appendChild(tr)
    })
  }

  displayModalData(coin, coins) {

    // current coin
    document.querySelector('.modal-title').innerHTML = 
    `
      <b>${coin.symbol}</b> 
      <small class='label'>${coin.name}</small> <br>
      <h6>Price: <span>$${coin.price}</span></h6>
      <h6>Total: <span>${coin.totalSupply.toLocaleString()}</span></h6>
      <h6>Circulating: <span>${coin.circulation.toLocaleString()}</span></h6>
    `

    // related coins
    coins.map(x => {

      // table row
      const tr = document.createElement('tr')
      tr.id = x.name
      tr.innerHTML =
      `
        <td>${x.id}</td>
        <td>
          <b>${x.symbol}</b> 
          <small class="label">${x.name}</small>
        </td>
        <td>$${x.price.toLocaleString()}</td>
        <td>${x.totalSupply.toLocaleString()}</td>
        <td>$${x.marketCap.toLocaleString()}</td>
        <td class="${x.oneHour < 0 ? 'text-error' : 'text-success'}">${x.oneHour}%</td>
        <td class="${x.oneDay < 0 ? 'text-error' : 'text-success'}">${x.oneDay}%</td>
        <td class="${x.sevenDay < 0 ? 'text-error' : 'text-success'}">${x.sevenDay}%</td>
      `

      // append to table
      document.querySelector('#relatedTable').appendChild(tr)
    })
  }
}


// --- Utility ---
class Utility {

  // --- Helpers ---
  static clearTable() {

    // remove previous data from table
    return new Promise(resolve => {

      document.querySelector('#mainTable').innerHTML = ''
      resolve()
    })
  }

  static getCoinByName(coin, coins) {

    // get coin from list of coins
    return new Promise(resolve => {

      let target
      coins.map((x, i) => {

        if (x.name === coin) target = x
        if (i === coins.length - 1) resolve(target)
      })
    })
  }

  static getCoinsByMinMax(coin, coins) {

    // get coins +- depending on coin supply total
    return new Promise(resolve => {

      // coin total supply + determin min and max
      const supply = coin.totalSupply
      let min, max

      if (supply <= 16000000) {

        min = supply - 1000000
        max = supply + 1000000

      } else if (supply <= 60000000) {

        min = supply - 3000000
        max = supply + 3000000

      } else if (supply <= 100000000) {

        min = supply - 20000000
        max = supply + 20000000

      } else if (supply <= 500000000) {

        min = supply - 75000000
        max = supply + 75000000

      } else if (supply <= 1000000000) {

        min = supply - 100000000
        max = supply + 100000000

      } else {

        min = supply - 500000000
        max = supply + 500000000
      }

      // filter for min and max
      let relevantCoins = []
      coins.map((x, i) => {

        if (x.totalSupply >= min && x.totalSupply <= max) relevantCoins = [...relevantCoins, x]
        if (i === coins.length - 1) resolve(relevantCoins)
      })
    })
  }


  // --- Sorting ---
  static sortByPriceAsc(coins) {

    // by price ascending
    return new Promise(resolve => {

      const sort = coins.sort((a, b) => a.price - b.price)
      resolve(sort)
    })
  }

  static sortByPriceDesc(coins) {

    // by price descending
    return new Promise(resolve => {

      const sort = coins.sort((a, b) => b.price - a.price)
      resolve(sort)
    })
  }

  static sortByRemainingAsc(coins) {

    // remaining coins
    return new Promise(resolve => {

      const sort = coins.sort((a, b) => a.remainingPercent - b.remainingPercent)
      resolve(sort)
    })
  }

  static sortByTotalSupplyAsc(coins) {

    // total supply
    return new Promise(resolve => {

      const sort = coins.sort((a, b) => a.totalSupply - b.totalSupply)
      resolve(sort)
    })
  }


  // --- Filtering ---
  static filterLowSupply(coins) {

    // supply less than 100 million
    return new Promise(resolve => {

      const filter = coins.filter(x => x.totalSupply <= 10000000)
      resolve(filter)
    })
  }

  static filterLowRemaining(coins) {

    // remain less than 25 percent
    return new Promise(resolve => {

      const filter = coins.filter(x => x.remainingPercent <= 26)
      resolve(filter)
    })
  }


  // --- Modal ---
  static showModal() {

    document.querySelector('.modal').classList.add('active')
  }

  static hideModal() {

    document.querySelector('.modal').classList.remove('active')
    document.querySelector('#relatedTable').innerHTML = ''
  }
}


// --- On Load ---
(() => Controller.getInstance())()