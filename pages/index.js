import Head from 'next/head'
import dynamic from 'next/dynamic'

const SeniorNiteApp = dynamic(() => import('../components/SeniorNiteApp'), { ssr: false })

export default function Home() {
  return (
    <>
      <Head>
        <title>SeniorNite – MVP</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>
      <main style={{minHeight:'100vh', background:'#f8fafc'}}>
        <SeniorNiteApp />
      </main>
    </>
  )
}
