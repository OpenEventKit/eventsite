import React from 'react'
import { Link } from 'gatsby'
import { connect } from 'react-redux'

import styles from '../styles/navbar.module.scss';
import LogoutButton from './LogoutButton';
import ProfilePopupComponent from './ProfilePopupComponent';

import { updateProfilePicture } from '../actions/user-actions'

import envVariables from '../utils/envVariables'

const UserNavbar = class extends React.Component {
  constructor(props) {
    super(props)
    this.state = {
      active: false,
      showProfile: false,
      navBarActiveClass: '',
    }
  }

  handlePictureUpdate = (picture) => {
    this.props.updateProfilePicture(picture);
  }

  toggleHamburger = () => {
    // toggle the active boolean in the state
    this.setState(
      {
        active: !this.state.active,
      },
      // after state has been updated,
      () => {
        // set the class in state for the navbar accordingly
        this.state.active
          ? this.setState({
            navBarActiveClass: `${styles.isActive}`,
          })
          : this.setState({
            navBarActiveClass: '',
          })
      }
    )
  }

  render() {

    let { isLoggedUser, userProfile } = this.props;
    let { showProfile } = this.state;

    let defaultPath = envVariables.AUTHORIZED_DEFAULT_PATH ? envVariables.AUTHORIZED_DEFAULT_PATH : '/a/';

    return (
      <nav className={`${styles.navbar} ${styles.userNavbar}`} role="navigation" aria-label="main navigation">
        <div className={styles.navbarMobile}>
          <div className={styles.navbarBrand}>
            <div className={styles.navbarItem}>
              <Link className={`${styles.button} ${styles.isLarge} ${styles.lobbyButton}`} to={defaultPath}>
                <strong>Lobby</strong>
              </Link>
            </div>
          </div>
          <div className={styles.navbarEnd}>
            <div className={styles.navbarItem}>
              <img onClick={() => this.setState({ showProfile: !showProfile })} className={styles.profilePic} src={userProfile?.pic} />
              {showProfile &&
                <ProfilePopupComponent
                  userProfile={userProfile}
                  showProfile={showProfile}
                  changePicture={(pic) => this.handlePictureUpdate(pic)}
                  closePopup={() => this.setState({ showProfile: !showProfile })}
                />
              }
            </div>
            <div className={styles.navbarItem}>
              <LogoutButton styles={styles} isLoggedUser={isLoggedUser} />
            </div>
          </div>
        </div>

        <div id="navbarBasicExample" className={`${styles.navbarMenu} ${this.state.navBarActiveClass}`}>
          <div className={styles.navbarStart}>
            <a role="button" className={`${styles.navbarBurger} ${styles.burger} ${styles.userBurger}`}
              aria-label="menu" aria-expanded="false" data-target="navbarBasicExample"
            >
              <span aria-hidden="true"></span>
              <span aria-hidden="true"></span>
              <span aria-hidden="true"></span>
            </a>
            <div className={styles.navbarItem}>
              <Link className={`${styles.button} ${styles.isLarge} ${styles.lobbyButton}`} to={defaultPath}>
                <strong>Lobby</strong>
              </Link>
            </div>
          </div>
          <div className={styles.navbarEnd}>
            <div className={styles.navbarItem}>
              <img onClick={() => this.setState({ showProfile: !showProfile })} className={styles.profilePic} src={userProfile?.pic} />
              {showProfile &&
                <ProfilePopupComponent
                  userProfile={userProfile}
                  showProfile={showProfile}
                  changePicture={(pic) => this.handlePictureUpdate(pic)}
                  closePopup={() => this.setState({ showProfile: !showProfile })}
                />
              }
            </div>
            <div className={styles.navbarItem}>
              <LogoutButton styles={styles} isLoggedUser={isLoggedUser} />
            </div>
          </div>
        </div>
      </nav>
    )
  }
}

export default connect(null, { updateProfilePicture })(UserNavbar)
