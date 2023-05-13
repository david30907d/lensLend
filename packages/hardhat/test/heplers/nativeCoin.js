async function transfer(from,to,amount){
  const tx = await from.sendTransaction({
    to,
    value:amount,
  })
  await tx.wait()
}

module.exports = {
  transfer
}
