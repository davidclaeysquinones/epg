const { parser, url, request } = require('./pickx.be.config.js')
const fs = require('fs')
const path = require('path')
const dayjs = require('dayjs')
const utc = require('dayjs/plugin/utc')
dayjs.extend(utc)

const date = dayjs.utc('2026-10-27').startOf('d')
const channel = {
  lang: 'nl',
  site_id: '1154'
}

it('can generate valid url', () => {
  expect(url({ channel, date })).toBe(
    'https://api.prod-ntvbe.tvapi-web.pickx.be/AGL/1.5/A/NLD/WEB/PXS/TRAY/EPG?from=1&to=1' +
      '&filter_channelIds=1154&filter_startTime=1793055600000&filter_endTime=1793142000000'
  )
})

it('can generate valid url for another language', () => {
  expect(url({ channel: { ...channel, lang: 'fr' }, date })).toContain('/AGL/1.5/A/FRA/WEB/PXS/')
})

it('requests the guide over a Brussels day, not a UTC one', () => {
  // the clock goes back on 2026-10-25, so that day is 25 hours long
  const params = new URL(url({ channel, date: dayjs.utc('2026-10-25') })).searchParams
  const start = Number(params.get('filter_startTime'))
  const stop = Number(params.get('filter_endTime'))

  expect(new Date(start).toISOString()).toBe('2026-10-24T22:00:00.000Z')
  expect(new Date(stop).toISOString()).toBe('2026-10-25T23:00:00.000Z')
  expect((stop - start) / 3600000).toBe(25)
})

it('can generate valid request headers', () => {
  expect(request.headers).toMatchObject({
    Origin: 'https://tv.pickx.be',
    Referer: 'https://tv.pickx.be/'
  })
})

it('can parse response', () => {
  const content = fs.readFileSync(path.resolve(__dirname, '__data__/data.json'))
  const result = parser({ content, channel, date }).map(p => {
    p.start = p.start.toJSON()
    p.stop = p.stop.toJSON()
    return p
  })

  expect(result.length).toBe(2)
  expect(result[0]).toMatchObject({
    start: '2026-10-27T05:05:00.000Z',
    stop: '2026-10-27T05:10:00.000Z',
    title: 'Bumba',
    sub_title: 'Bumba tovert zijn neus',
    category: ['Cartoon'],
    season: 1,
    episode: 60,
    actors: ['Patrick Maillard', 'Dirk Verbeeck', 'Britt Van Der BorghtVertelstem'],
    director: ['Serge Leurs'],
    date: 2022,
    country: 'be',
    image:
      'https://experience-cache.cdi.streaming.proximustv.be/posterserver/poster/EPG/250_250_9BB66B26ABED50DCA0A1509FE2481572.jpg'
  })
  expect(result[0].description).toContain('Peuterprogramma waarin het clowntje Bumba')
})

it('can handle empty guide', () => {
  const result = parser({
    date,
    channel,
    content: ''
  })
  expect(result).toMatchObject([])
})

it('can handle a channel the guide returned nothing for', () => {
  const result = parser({
    date,
    channel,
    content: JSON.stringify({ resultCode: 'OK', resultObj: { total: 0, containers: [] } })
  })
  expect(result).toMatchObject([])
})
