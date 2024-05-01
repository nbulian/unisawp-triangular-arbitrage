require('dotenv').config()
const { sign } = require('crypto');
const { ethers } = require('ethers');
const QuoterABI = require('@uniswap/v3-periphery/artifacts/contracts/lens/Quoter.sol/Quoter.json').abi

function getFile(fPath) {
    const fs = require('fs')

    try {
        const data = fs.readFileSync(fPath, 'utf8')
        return data
    } catch (error) {
        return []
    }
}

async function getPrice(factory, amountIn, trade1Direction) {
    // Get provider
    const provider = new ethers.JsonRpcProvider('https://mainnet.infura.io/v3/21783af8df1145f791a3eb0875815118')
    const ABI = [
        "function token0() external view returns (address)",
        "function token1() external view returns (address)",
        "function fee() external view returns (uint24)"
    ]
    const address = factory

    // Get pool token information
    const poolContract = new ethers.Contract(address, ABI, provider)
    let token0Address = await poolContract.token0()
    let token1Address = await poolContract.token1()
    let tokenFee = await poolContract.fee()
    const deadline = Math.floor(Date.now() / 1000) + 60 * 10; // Current timestamp + 10 minutes (adjust as needed)

    // Get individual token information (symbol, name, decimals)
    let addressArray = [token0Address, token1Address]
    let tokenInfoArray = []
    for (let i = 0; i < addressArray.length; i++) {
        let tokenAddress = addressArray[i]
        let tokenABI = [
            "function name() view returns (string)",
            "function symbol() view returns (string)",
            "function decimals() view returns (uint)"
        ]
        let contract = new ethers.Contract(tokenAddress, tokenABI, provider)
        let tokenSymbol = await contract.symbol()
        let tokenName = await contract.name()
        let tokenDecimals = await contract.decimals()
        let tokenObj = {
            id: 'token' + i,
            tokenSymbol: tokenSymbol,
            tokenName: tokenName,
            tokenDecimals: tokenDecimals,
            tokenAddress: tokenAddress
        }
        tokenInfoArray.push(tokenObj)
    }

    // Identify the correct token to input as A and also B respectively
    let inputTokenA = ''
    let inputTokenDecimalsA = 0
    let inputTokenB = ''
    let inputTokenDecimalsB = 0

    if (trade1Direction == 'baseToQuote') {
        inputTokenA = tokenInfoArray[0].tokenAddress
        inputTokenDecimalsA = tokenInfoArray[0].tokenDecimals
        inputTokenB = tokenInfoArray[1].tokenAddress
        inputTokenDecimalsB = tokenInfoArray[1].tokenDecimals
    }

    if (trade1Direction == 'quoteToBase') {
        inputTokenA = tokenInfoArray[1].tokenAddress
        inputTokenDecimalsA = tokenInfoArray[1].tokenDecimals
        inputTokenB = tokenInfoArray[0].tokenAddress
        inputTokenDecimalsB = tokenInfoArray[0].tokenDecimals
    }

    // Reformat amount in
    if (!isNaN(amountIn)) { amountIn = amountIn.toString() }
    let amountInReformated = ethers.parseUnits(amountIn, inputTokenDecimalsA).toString()

    // Get Uniswap v3 quoter
    const quoterAddress = '0xb27308f9F90D607463bb33eA1BeBb41C27CE5AB6'
    const quoterContract = new ethers.Contract(quoterAddress, QuoterABI, provider)
    let quotedAmountOut = 0

    // const wallet = ethers.Wallet.fromPhrase(process.env.APP_PHRASE)
    // const signer = await wallet.getSigner()

    try {
        quotedAmountOut = await quoterContract.quoteExactInputSingle(
            inputTokenA,
            inputTokenB,
            tokenFee,
            amountInReformated,
            deadline
        )
    } catch (error) {
        console.log(error)
        return 0
    }

    console.log('Quoted Amount Out', quotedAmountOut)
}

async function getDepth(amountIn, limit) {
    console.log('Reading surface rate information...')
    let fileInfo = getFile('./uniswap_surface_rates.json')
    fileJsonArray = JSON.parse(fileInfo)
    fileJsonArrayLimit = fileJsonArray.slice(0, limit)

    for (let i = 0; i < fileJsonArrayLimit.length; i++) {
        const element = fileJsonArrayLimit[i];

        // Extract the variables
        let pair1ContractAddress = fileJsonArrayLimit[i].poolContract1
        let pair2ContractAddress = fileJsonArrayLimit[i].poolContract2
        let pair3ContractAddress = fileJsonArrayLimit[i].poolContract3
        let trade1Direction = fileJsonArrayLimit[i].poolDirectionTrade1
        let trade2Direction = fileJsonArrayLimit[i].poolDirectionTrade2
        let trade3Direction = fileJsonArrayLimit[i].poolDirectionTrade3

        // Trade 1
        console.log('Checking trade 1 acquired coin...')
        let acquiredCoinDetailT1 = await getPrice(pair1ContractAddress, amountIn, trade1Direction)
    }
    return
}

getDepth(1, 1)