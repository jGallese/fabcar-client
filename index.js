"use strict"

const {Gateway, Wallets} = require("fabric-network")
const path = require("path")
const fs = require("fs")

async function main() {
 try{
    const ccpPath = path.resolve(__dirname, 'connection-profile.json')
    const ccp = JSON.parse(fs.readFileSync(ccpPath, 'utf8'))


    const walletPath = path.join(process.cwd(), 'wallet')
    const wallet = await Wallets.newFileSystemWallet(walletPath);

    // Ruta al directorio de certificados

    const credPath = path.resolve(__dirname, 'wallet', 'appUser', 'msp');

    // leer el certificado

    const certPath = path.join(credPath, 'signcerts', 'cert.pem');
    const certificate = fs.readFileSync(certPath).toString();

    // buscar el archivo de la clave privada en el directorio 'keystore'

    const keyDir = path.join(credPath, 'keystore');
    const keyFiles = fs.readdirSync(keyDir);
    const privateKeyPath = path.join(keyDir, keyFiles[0]);
    const privateKey = fs.readFileSync(privateKeyPath).toString()

    //crear una nueva indentidad y agregarla a la billetera
    const identityLabel = 'appUser'
    const identity = {
        credentials: {
            certificate: certificate,
            privateKey: privateKey,
        },
        mspId: 'Org1MSP',
        type: 'X.509',
    }
    await wallet.put(identityLabel, identity);

    // crear una nueva pasarela para conectarse a la red
    const gateway = new Gateway();
    await gateway.connect(ccp, {
        wallet,
        identity: 'appUser',
        discovery: {enabled: false, asLocalhost: true},

    });

    //obtener la red de la blockchain
    const network = await gateway.getNetwork('default');

    //obtener el contrato del chaincode
    const contract = network.getContract('chaincode-fabcar');

    //inicializar el ledger con datos de prueba
    console.log("iniciando el ledger")
    await contract.submitTransaction('initLedger')
    console.log("ledger inicializado");

    //consultar todos los automoviles
    console.log("consultando todos los automoviles")

    const result = await contract.evaluateTransaction("queryAllCars");
    console.log("resultado de la transaccion:")
    console.log(result.toString())


    //crear un nuevo automovil
    console.log("creando un nuevo automovil")
    await contract.submitTransaction("createCar", "CAR12", "Honda", "Civic", "black", "Dave");

    console.log("Transaccion enviada: se creo el automovil CAR12")

    //consultar un automovil especifico
    console.log("consultando el automovil car12")
    const car12 = await contract.evaluateTransaction("queryCar", "CAR12")
    
    // Cambiar el propietario de un automóvil
    console.log("--- Cambiando el propietario del automóvil CAR12---");
    await contract.submitTransaction("changeCarOwner", "CAR12", "Alice");
    console.log("transaccion enviada. cambio de auto car12 a Alice");

    //Desconectar la pasarela
    await gateway.disconnect()
 }  catch (error) {
    console.error("Fallo la transaccion");
    process.exit(1);
 }
}

main();