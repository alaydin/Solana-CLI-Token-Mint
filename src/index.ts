/* The program essentially creates and mints new token with the specified information in global constants
** It creates an keypair in .env file if you don't already have and airdrops SOL
** Commented section in main uses helper functions and create multiple transaction to achieve the goal
** Uncommented section creates a single transaction to do the same
** Make sure you also checked "createMetadata.ts" if you want to use helper functions
*/

import { initializeKeypair } from "./initializeKeypair"
import { createTokenMetadata } from "./createMetadata"
import * as web3 from "@solana/web3.js"
import * as token from "@solana/spl-token"
import {
  Metaplex,
  keypairIdentity,
  bundlrStorage,
} from "@metaplex-foundation/js"
import { createMintToInstruction, createAssociatedTokenAccountInstruction } from "@solana/spl-token"

const TOKEN_NAME = "Galactus Token";
const TOKEN_SYMBOL = "GT";
const TOKEN_DESCRIPTION = "Destroyer";
const TOKEN_AMOUNT = 100;

async function createMint(
  connection: web3.Connection,
  payer: web3.Keypair,
  mintAuth: web3.PublicKey,
  freezeAuth: web3.PublicKey,
  decimals: number): Promise<web3.PublicKey> {
  const tokenMint = await token.createMint(connection, payer, mintAuth, freezeAuth, decimals);
  console.log(
    `Token Mint: https://explorer.solana.com/address/${tokenMint}?cluster=devnet`
  );
  return tokenMint;

}

async function createTokenAccount(connection: web3.Connection, payer: web3.Keypair, mint: web3.PublicKey, owner: web3.PublicKey) {
  const tokenAccount = await token.getOrCreateAssociatedTokenAccount(connection, payer, mint, owner); // Returns Address of the new associated token account

  console.log(`Token Account: https://explorer.solana.com/address/${tokenAccount.address}?cluster=devnet`);

  return tokenAccount;
}

async function mintToken(
  connection: web3.Connection,
  payer: web3.Keypair,
  mint: web3.PublicKey,
  destination: web3.PublicKey,
  auth: web3.Keypair,
  amount: number
) {
  const mintSig = await token.mintTo(connection, payer, mint, destination, auth, amount);

  console.log(
    `Mint Token Transaction: https://explorer.solana.com/tx/${mintSig}?cluster=devnet`
  )
}

async function approveDelegate(
  connection: web3.Connection,
  payer: web3.Keypair,
  account: web3.PublicKey,
  delegate: web3.PublicKey,
  owner: web3.Signer | web3.PublicKey,
  amount: number
) {
  const txSig = await token.approve(connection, payer, account, delegate, owner, amount);

  console.log(
    `Approve Delegate Transaction: https://explorer.solana.com/tx/${txSig}?cluster=devnet`
  )
}

async function transferToken(
  connection: web3.Connection,
  payer: web3.Keypair,
  source: web3.PublicKey,
  destination: web3.PublicKey,
  owner: web3.Keypair,
  amount: number
) {
  const txSig = await token.transfer(connection, payer, source, destination, owner, amount);

  console.log(
    `Approve Delegate Transaction: https://explorer.solana.com/tx/${txSig}?cluster=devnet`
  )
}

async function revokeDelegate(
  connection: web3.Connection,
  payer: web3.Keypair,
  account: web3.PublicKey,
  owner: web3.Signer | web3.PublicKey,
) {
  const transactionSignature = await token.revoke(
    connection,
    payer,
    account,
    owner,
  )

  console.log(
    `Revote Delegate Transaction: https://explorer.solana.com/tx/${transactionSignature}?cluster=devnet`
  )
}

async function main() {
  const connection = new web3.Connection(web3.clusterApiUrl("devnet"));
  const user = await initializeKeypair(connection);

  console.log("PublicKey:", user.publicKey.toBase58());

  // Metaplex setup
  const metaplex = Metaplex.make(connection).use(keypairIdentity(user)).use(bundlrStorage({
    address: "https://devnet.bundlr.network",
    providerUrl: "https://api.devnet.solana.com",
    timeout: 60000,
  }));

  /*
  // Create Mint Account and get its info
  const mint = await createMint(connection, user, user.publicKey, user.publicKey, 2);
  const mintInfo = await token.getMint(connection, mint);

  // Create Token Account for the Mint Account we just created above
  const tokenAccount = await createTokenAccount(connection, user, mint, user.publicKey);

  // Mint Tokens with the information we have above
  mintToken(connection, user, mint, tokenAccount.address, user, 100 * 10 ** mintInfo.decimals);

  // Create a delegate account
  const delegate = web3.Keypair.generate();

  // Approve delegate
  approveDelegate(connection, user, tokenAccount.address, delegate.publicKey, user, 10 ** mintInfo.decimals * 50);

  // Create another keypair and token account for it to simulate having someone to send tokens to
  const receiver = web3.Keypair.generate();
  const receiverTokenAccount = await createTokenAccount(connection, user, mint, receiver.publicKey);

  // Transfer Tokens
  transferToken(connection, user, tokenAccount.address, receiverTokenAccount.address, delegate, 50 * 10 ** mintInfo.decimals);

  // Revoke delegate
  revokeDelegate(connection, user, delegate.publicKey, user);

  // remove comment if you already minted and change mint address
  // const MINT_ADDRESS = "B2ZNDLv9M2bBJSTVWZU29vjJ66aRRFNCeS9TL1fTuTmb";

  await createTokenMetadata(connection, metaplex, new web3.PublicKey(MINT_ADDRESS), user, "Galactus Token", "GT", "Destroyer of worlds");
  */


  /* Another way of doing it is to create a single transaction that does all above
  ** 
  */
  const mintAccountKeypair = web3.Keypair.generate();
  const programId = token.TOKEN_PROGRAM_ID;
  const decimals = 2;
  const associatedTokenAddress = await token.getAssociatedTokenAddress(mintAccountKeypair.publicKey, user.publicKey, false);
  const createTokenAccountInstruction = createAssociatedTokenAccountInstruction(
    user.publicKey, // payer
    associatedTokenAddress, // token address
    user.publicKey, // token owner
    mintAccountKeypair.publicKey // token mint
  )

  // add mint account to transaction
  const transaction = new web3.Transaction().add(
    // create mint account
    web3.SystemProgram.createAccount(
      {
        fromPubkey: user.publicKey,
        lamports: await token.getMinimumBalanceForRentExemptMint(connection),
        newAccountPubkey: mintAccountKeypair.publicKey,
        space: token.MINT_SIZE,
        programId
      }
    ),
    token.createInitializeMintInstruction(mintAccountKeypair.publicKey, decimals, user.publicKey, user.publicKey)
  )

  // add metadata to transaction
  transaction.add(await createTokenMetadata(connection, metaplex, mintAccountKeypair.publicKey, user, TOKEN_NAME, TOKEN_SYMBOL, TOKEN_DESCRIPTION))

  transaction.add(createTokenAccountInstruction)

  // add mint
  transaction.add(
    createMintToInstruction(mintAccountKeypair.publicKey, associatedTokenAddress, user.publicKey, TOKEN_AMOUNT ** decimals)
  )

  console.log("current tx:", transaction);


  const transactionSignature = await web3.sendAndConfirmTransaction(connection, transaction, [user, mintAccountKeypair]);
  console.log(
    `Created and Minted Token: https://explorer.solana.com/tx/${transactionSignature}?cluster=devnet`
  )

}

main()
  .then(() => {
    console.log("Finished successfully")
    process.exit(0)
  })
  .catch((error) => {
    console.log(error)
    process.exit(1)
  })
