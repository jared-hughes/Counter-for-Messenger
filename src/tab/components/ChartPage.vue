<template>
  <el-container>
    <el-menu
      default-active=""
      class="el-menu-vertical"
      text-color="#4bcc1f"
      :collapse="isCollapse"
      mode="vertical">
      <el-menu-item index="0" @click="isCollapse = !isCollapse">
        <i :class="(isCollapse) ? 'el-icon-arrow-right' : 'el-icon-arrow-left'"></i>
        <span slot="title">{{ __('operationBar') }}</span>
      </el-menu-item>
      <el-menu-item index="1" @click="clickMenuItemHandle('isShowCharacterSwitch')">
        <i class="el-icon-message"></i>
        <span slot="title">
          <el-switch
            ref="isShowCharacterSwitch"
            v-model="isShowCharacter"
            active-color="#4bcc1f"
            inactive-color="#0084ff"
            :active-text="__('showCharacter')"
            :inactive-text="__('showMessage')"></el-switch>
        </span>
      </el-menu-item>
      <el-menu-item index="2" @click="clickMenuItemHandle('isShowDetailSwitch')">
        <i class="el-icon-document"></i>
        <span slot="title">
          <el-switch
            ref="isShowDetailSwitch"
            v-model="isShowDetail"
            active-color="#4bcc1f"
            inactive-color="#0084ff"
            :active-text="__('showDetail')"
            :inactive-text="__('showTotal')"></el-switch>
        </span>
      </el-menu-item>
      <el-menu-item index="3" @click="generateSharingDialog">
        Generate Image
      </el-menu-item>
    </el-menu>
    <template v-if="isBar">
      <bar-chart
        ref="barChart"
        :chart-data="chartData"
        :styles="chartContainerStyles"
        :height="chartHeight"
        :options="barOption">
      </bar-chart>
      <sharing-dialog ref="sharingDialog" :jar="ctx.jar" />
      <el-aside width="50px">
        <el-tooltip class="item" effect="dark" :content="__('drapToLookOtherUsers')" placement="left">
          <el-slider
            v-model="rank"
            vertical
            :height="chartHeight - 18 + "px""
            :min="1"
            :max="this.threads.length"
            @change="renderChart()">
          </el-slider>
        </el-tooltip>
      </el-aside>
    </template>
    <template v-else>
      <line-chart
        ref="lineChart"
        :chart-data="lineChartData"
        :styles="chartContainerStyles"
        :height="chartHeight"
        :options="lineOption">
      </line-chart>
    </template>
  </el-container>
</template>
<script>
import { Message } from 'element-ui'
import ColorHash from 'color-hash'
import BarChart from './BarChart.js'
import LineChart from './LineChart.js'
import SharingDialog from './SharingDialog.vue'
import fetchThreadDetail from '../lib/fetchThreadDetail.js'
const __ = chrome.i18n.getMessage
const colorHash = new ColorHash({ lightness: [0.35, 0.5, 0.65] })
const colorHashFG = new ColorHash({ lightness: 0.4 })
const colorHashBG = new ColorHash({ lightness: 0.8 })

export default {
  name: 'ChartPage',

  components: { LineChart, BarChart, SharingDialog },

  props: ['ctx'],

  data () {
    const threads = this.ctx.threads
    return {
      chartHeight: document.documentElement.clientHeight - 130,
      chartContainerStyles: {
        position: 'relative',
        width: '100%',
        'min-width': '400px',
        height: document.documentElement.clientHeight - 130 + 'px'
      },
      isCollapse: false,
      isBar: true,
      loading: null,
      loadingCount: 0,
      chartData: null,
      thread: null,
      lineChartData: null,
      threads,
      rank: threads.length,
      sliderMax: 1,
      isShowCharacter: false,
      isShowDetail: false,
      barOption: {
        responsive: true,
        maintainAspectRatio: false,
        title: {
          display: true,
          fontSize: 16,
          padding: 5,
          text: ''
        },
        legend: { display: false },
        tooltips: {
          filter: (tooltip) => tooltip.xLabel !== 0 && !isNaN(tooltip.xLabel)
        },
        scales: {
          xAxes: [{ stacked: true }],
          yAxes: [{ stacked: true, barPercentage: 0.7 }]
        },
        onClick: this.onClickBar.bind(this)
      },
      lineOption: {
        responsive: true,
        scales: {
          yAxes: [{
            stacked: true
          }]
        },
        animation: {
          duration: 750
        }
      }
    }
  },

  async created () {
    this.$nextTick(() => window.addEventListener('resize', () =>
      (this.chartHeight = document.documentElement.clientHeight - 130)))
    this.renderChart()
    this.changeChartTitle()
  },

  watch: {
    chartHeight (height) {
      this.chartContainerStyles.height = height + 'px'
      this.renderChart()
    },
    isShowDetail () {
      this.changeChartTitle()
      this.renderChart()
    },
    isShowCharacter () {
      this.changeChartTitle()
      this.renderChart()
    }
  },

  computed: { amountOfMaxDisplay () { return this.chartHeight / 20 } },

  methods: {
    onClickBar (evt, array) {
      // https://stackoverflow.com/a/54080553/7481517
      if (array.length !== 0) {
        // did not select background
        var position = array[0]._index
        // found the thread clicked
        this.thread = this.splicedThreads[position]
        this.isBar = false
        this.renderChart()
      }
    },
    changeChartTitle () {
      const specs = [
        (this.isShowDetail) ? __('detail') : __('total'),
        (this.isShowCharacter) ? __('character') : __('message')
      ]
      this.barOption.title.text = specs.join(' / ')
    },
    clickMenuItemHandle (refName) {
      const itemVm = this.$refs[refName]
      itemVm.$emit('input', !itemVm.value)
    },
    generateSharingDialog () {
      this.$ga.event('SharingImage', 'generate')

      this.$refs.sharingDialog.canvas = this.isBar ? this.$refs.barChart.canvas : this.$refs.lineChart.canvas
      this.$refs.sharingDialog.show()
    },
    async renderChart () {
      if (this.isBar) {
        await this.renderBarChart()
      } else {
        await this.renderLineChart()
      }
    },
    async renderLineChart () {
      // // bucket quarterly
      const resolution = 86400 * 1000 * 365.2475 / 4
      /*
      thread {
        1234:
      }
      */
      const datasets = {}
      let bucketStarts = []
      let spanEnd = null
      let spanStart = null
      const times = this.thread.messageTimes
      for (const { user } of this.thread.participants) {
        const last = times[user.id][times[user.id].length - 1]
        if (!spanEnd || last > spanEnd) {
          spanEnd = last
        }
        const first = times[user.id][0]
        if (!spanStart || first < spanStart) {
          spanStart = first
        }
      }
      console.error('datasets', datasets)
      for (const { user } of this.thread.participants) {
        const isFirst = bucketStarts.length === 0
        datasets[user.id] = []
        let current = spanStart
        let i = 0
        while (current < spanEnd) {
          if (isFirst) {
            bucketStarts.push(current)
          }
          const start = i
          current += resolution
          while (i < times[user.id].length && times[user.id][i] < current) {
            i++
          }
          // + 1 to count inclusive, e.g. 3 to 6 is 6-3+1=4 numbers inclusive
          datasets[user.id].push(i - start + 1)
        }
        if (isFirst) {
          bucketStarts.push(current)
        }
      }
      bucketStarts = bucketStarts.map(t => new Date(t).toLocaleDateString())
      this.lineChartData = {
        labels: bucketStarts,
        datasets: this.thread.participants.map(({ user }) => {
          const bgColor = colorHashBG.hex(user.id, { lightness: 0.8 })
          const fgColor = colorHashFG.hex(user.id, { lightness: 0.4 })
          console.log('user')
          console.log('data', datasets[user.id])
          return {
            label: user.name,
            fill: true,
            backgroundColor: bgColor,
            borderColor: fgColor,
            pointHighlightStroke: fgColor,
            borderCapStyle: fgColor,
            data: datasets[user.id]
          }
        })
      }
    },
    async renderBarChart () {
      const startSliceIndex = this.threads.length - Number(this.rank)
      const splicedThreads = this.threads.slice(startSliceIndex, startSliceIndex + this.amountOfMaxDisplay)
      this.splicedThreads = splicedThreads
      if (!(!this.isShowCharacter && !this.isShowDetail)) {
        await this.syncThreadDetail(splicedThreads)
      }
      // Show Overview
      if (!this.isShowDetail) {
        this.chartData = {
          labels: splicedThreads.map((thread) => thread.threadName),
          datasets: [{
            label: __('total'),
            backgroundColor: '#0083FF',
            data: splicedThreads.map((thread) => this.selectCountType(thread))
          }]
        }
      } else {
        // Show Detail
        if (!this.ctx.purchased) {
          const participantsStatus = splicedThreads
            .map((thread, i) => {
              let me = 0
              let other = 0
              thread.participants.forEach((participant) => {
                if (participant.user.id === this.ctx.jar.selfId) me = this.selectCountType(participant)
                else other += this.selectCountType(participant)
              })
              return [me, other]
            })
            .reduce((cur, row) => {
              cur[0].push(row[0])
              cur[1].push(row[1])
              return cur
            }, [[], []])
          const datasets = participantsStatus.map((status, i) => ({
            label: (i === 0) ? 'Me' : 'Other',
            backgroundColor: (i === 0) ? '#4BCC1F' : '#F03C24',
            data: status
          }))
          this.chartData = {
            labels: splicedThreads.map((info) => info.threadName),
            datasets
          }
        } else {
          // Show more Detail (pro)
          const labels = splicedThreads.map((thread) => thread.threadName)
          const datasetsMap = new Map()
          splicedThreads.forEach((thread, i) => {
            const color = (thread.type !== 'GROUP') ? thread.color : null
            thread.participants.forEach((participant) => {
              const userId = participant.user.id
              const userName = participant.user.name
              if (datasetsMap.has(userId)) {
                datasetsMap.get(userId).data[i] = this.selectCountType(participant)
              } else {
                const data = Array(splicedThreads.length).fill(0)
                data[i] = this.selectCountType(participant)
                datasetsMap.set(userId, {
                  label: userName,
                  backgroundColor: (userId === this.ctx.jar.selfId)
                    ? '#4BCC1F' : (color || colorHash.hex(participant.user.name)),
                  data
                })
              }
            })
          })
          const datasets = [...datasetsMap]
            .sort((a, b) => {
              if (a[0] === this.ctx.jar.selfId) return -1
              if (b[0] === this.ctx.jar.selfId) return 1
              return 0
            })
            .map((data) => data[1])
          this.chartData = {
            labels,
            datasets
          }
        }
      }
    },
    async syncThreadDetail (threads) {
      this.loadingCount = 0
      this.loading = this.$loading({
        lock: true,
        text: __('fetchingMessages'),
        spinner: 'el-icon-loading',
        background: 'rgba(0, 0, 0, 0.7)'
      })
      const errorQueue = []
      await Promise.all(threads.map(async (thread) => {
        if (thread.characterCount) return
        if (!thread.messages) {
          const cachedThread = await this.ctx.db.get(thread.id)
          if (cachedThread && cachedThread.messages) return
          thread.isLoading = true
          try {
            const result = await fetchThreadDetail({
              jar: this.ctx.jar, thread, $set: this.$set
            })
            thread.needUpdate = false
            thread.analyzeMessages(result)
            await this.ctx.db.put({ id: thread.id, messages: result })
          } catch (err) {
            console.error(err)
            if (errorQueue.indexOf(err.message) === -1) {
              errorQueue.push(err.message)
            }
          }
          thread.isLoading = false
        } else thread.analyzeMessages()

        this.loading.text = `${__('fetchingMessages')}[${++this.loadingCount}/${threads.length}]`
      }))
      if (errorQueue.length) {
        Message({
          type: 'error',
          message: errorQueue.join('. ')
        })
      }
      this.loading.close()
      return threads
    },
    selectCountType (object) {
      const type = (this.isShowCharacter) ? 'characterCount' : 'messageCount'
      return object[type]
    }
  }
}
</script>

<style scoped>
aside {
  min-width: 50px;
}
.el-menu-vertical {
  left: 0px;
}
.el-menu-vertical:not(.el-menu--collapse) {
  min-height: 400px;
}
.el-menu>li:last-child {
  float: none;
}
</style>
