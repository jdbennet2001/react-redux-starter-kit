import React from 'react'
import './HomeView.scss'
import NavList from './NavList'
import CoversView from './CoversView'

export const HomeView = () => (
  <div className='home-page'>
    <div className='nav-pane'>
      <NavList></NavList>
    </div>
    <div className='content-pane'>
      <CoversView router={this.props}></CoversView>
    </div>
  </div>
)

export default HomeView
