import React from 'react'
import styles from './Header.module.css'

export default function Header() {
  return (
    <div className={styles.container}>
      <div className={styles.brand}>
        <img src="/logo.png" alt="logo" className={styles.logo}/>
        <h1 className={styles.title}>Contact Management System</h1>
      </div>
    </div>
  )
}
