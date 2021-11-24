CREATE TABLE [dbo].[EmployeePhoneNumbers]
(
[EmployeePhoneNumberID] [int] NOT NULL IDENTITY(1, 1),
[EmployeeID] [int] NOT NULL,
[PhoneTypeID] [int] NOT NULL,
[PhoneNumber] [nvarchar] (14) COLLATE SQL_Latin1_General_CP1_CI_AS NULL
) ON [PRIMARY]
GO
ALTER TABLE [dbo].[EmployeePhoneNumbers] ADD CONSTRAINT [PK_EmployeePhoneNumbers] PRIMARY KEY CLUSTERED ([EmployeePhoneNumberID]) ON [PRIMARY]
GO
CREATE NONCLUSTERED INDEX [IX_EmployeePhoneNumbers_Employee_PhoneType] ON [dbo].[EmployeePhoneNumbers] ([EmployeeID], [PhoneTypeID]) ON [PRIMARY]
GO
CREATE NONCLUSTERED INDEX [IX_EmployeePhoneNumbers_PhoneType_Employee] ON [dbo].[EmployeePhoneNumbers] ([PhoneTypeID], [EmployeeID]) ON [PRIMARY]
GO
ALTER TABLE [dbo].[EmployeePhoneNumbers] ADD CONSTRAINT [FK_EmployeePhoneNumbers_Employees] FOREIGN KEY ([EmployeeID]) REFERENCES [dbo].[Employees] ([EmployeeID])
GO
ALTER TABLE [dbo].[EmployeePhoneNumbers] ADD CONSTRAINT [FK_EmployeePhoneNumbers_PhoneType] FOREIGN KEY ([PhoneTypeID]) REFERENCES [dbo].[PhoneType] ([PhoneTypeID])
GO
