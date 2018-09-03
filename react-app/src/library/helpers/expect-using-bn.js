import bnChai from 'bn-chai'
import BN from 'bn.js'
import chai, { expect } from 'chai'
import chaiSubset from 'chai-subset'

chai.use(bnChai(BN)).use(chaiSubset)

export default expect
